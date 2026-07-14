package main

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/PuerkitoBio/goquery"
)

var baseURL string

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

type Album struct {
	Title     string   `json:"title"`
	VtName    string   `json:"vtName"`
	Thumbnail *string  `json:"thumbnail"`
	Platforms []string `json:"platforms"`
	Year      string   `json:"year"`
	Link      string   `json:"link"`
}

type TrackLinks struct {
	Ref      string  `json:"ref"`
	Download *string `json:"download"`
}

type Track struct {
	Title string     `json:"title"`
	Links TrackLinks `json:"links"`
}

type AlbumData struct {
	Name     string   `json:"name"`
	AlbumArt []string `json:"albumArt"`
	Tracks   []Track  `json:"tracks"`
}

func fetchDoc(rawURL string) (*goquery.Document, error) {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d for %s", resp.StatusCode, rawURL)
	}

	return goquery.NewDocumentFromReader(resp.Body)
}

func SearchAlbum(query string) ([]Album, error) {
	searchURL := fmt.Sprintf("%s/search?search=%s", baseURL, url.QueryEscape(query))

	doc, err := fetchDoc(searchURL)
	if err != nil {
		return nil, err
	}

	var albums []Album

	// Each result is a <tr> whose first <td> contains a thumbnail <img>
	doc.Find("tr").Each(func(_ int, row *goquery.Selection) {
		cells := row.Find("td")
		if cells.Length() < 5 {
			return
		}

		// Only album rows have an img in the first cell
		imgSrc, exists := cells.Eq(0).Find("img").Attr("src")
		if !exists || imgSrc == "" {
			return
		}

		// Title and link from second cell
		titleAnchor := cells.Eq(1).Find("a").First()
		title := strings.TrimSpace(titleAnchor.Text())
		link, _ := titleAnchor.Attr("href")
		if title == "" || link == "" {
			return
		}

		// Platforms from third cell
		platforms := []string{}
		cells.Eq(2).Find("a").Each(func(_ int, s *goquery.Selection) {
			if p := strings.TrimSpace(s.Text()); p != "" {
				platforms = append(platforms, p)
			}
		})

		// Year from last cell (index 4)
		year := strings.TrimSpace(cells.Eq(4).Text())

		vtName := ""
		parts := strings.Split(strings.Trim(link, "/"), "/")
		if len(parts) > 0 {
			vtName = parts[len(parts)-1]
		}

		thumbnail := imgSrc
		albums = append(albums, Album{
			Title:     title,
			VtName:    vtName,
			Thumbnail: &thumbnail,
			Platforms: platforms,
			Year:      year,
			Link:      link,
		})
	})

	return albums, nil
}

func GetAlbumData(vtname string) (AlbumData, error) {
	albumURL := fmt.Sprintf("%s/game-soundtracks/album/%s", baseURL, vtname)

	doc, err := fetchDoc(albumURL)
	if err != nil {
		return AlbumData{}, err
	}

	// Album art: look for <a> inside .albumImage, fallback to <img> src
	albumArt := []string{}
	doc.Find(".albumImage").Each(func(_ int, s *goquery.Selection) {
		if href, exists := s.Find("a").Attr("href"); exists && href != "" {
			albumArt = append(albumArt, href)
		} else if src, exists := s.Find("img").Attr("src"); exists && src != "" {
			albumArt = append(albumArt, src)
		}
	})

	// Tracks: rows have a track-number cell (e.g. "1.") followed by a cell
	// with an <a href> pointing into the album. The track-number cell isn't
	// always at a fixed index: multi-disc albums (e.g. Ace Combat 5) insert
	// an extra "CD" column before it, so we search for it instead of
	// assuming a column position.
	tracks := []Track{}
	seen := make(map[string]bool)

	doc.Find("tr").Each(func(_ int, row *goquery.Selection) {
		cells := row.Find("td")
		if cells.Length() < 3 {
			return
		}

		trackIdx := -1
		cells.EachWithBreak(func(i int, cell *goquery.Selection) bool {
			text := strings.TrimSpace(cell.Text())
			if text == "" || !strings.HasSuffix(text, ".") {
				return true
			}
			if _, err := strconv.Atoi(strings.TrimSuffix(text, ".")); err != nil {
				return true
			}
			trackIdx = i
			return false
		})
		if trackIdx == -1 || trackIdx+1 >= cells.Length() {
			return
		}

		// Next cell has the track title and href
		a := cells.Eq(trackIdx + 1).Find("a").First()
		href, exists := a.Attr("href")
		if !exists || href == "" {
			return
		}

		// Must be a track page link (not a platform/year link)
		if !strings.Contains(href, "/game-soundtracks/album/") {
			return
		}

		title := strings.TrimSpace(a.Text())
		if title == "" || seen[href] {
			return
		}
		seen[href] = true

		ref := baseURL + href
		tracks = append(tracks, Track{
			Title: title,
			Links: TrackLinks{Ref: ref},
		})
	})

	return AlbumData{
		Name:     vtname,
		AlbumArt: albumArt,
		Tracks:   tracks,
	}, nil
}

func GetDownloadLinks(innerLinks []string) (map[string]string, error) {
	const maxConcurrent = 10

	result := make(map[string]string, len(innerLinks))
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, maxConcurrent)

	for _, link := range innerLinks {
		wg.Add(1)
		sem <- struct{}{}

		go func(link string) {
			defer wg.Done()
			defer func() { <-sem }()

			doc, err := fetchDoc(link)
			if err != nil {
				return
			}

			src, exists := doc.Find("#audio").Attr("src")
			if !exists || src == "" {
				return
			}

			mu.Lock()
			result[link] = src
			mu.Unlock()
		}(link)
	}

	wg.Wait()

	return result, nil
}
