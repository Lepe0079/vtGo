package main

import (
	"fmt"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func TestSearch(t *testing.T) {
	albums, err := SearchAlbum("zelda")
	if err != nil {
		t.Fatal("search error:", err)
	}
	fmt.Printf("Found %d albums\n", len(albums))
	for i, a := range albums {
		if i >= 5 {
			break
		}
		thumb := "nil"
		if a.Thumbnail != nil {
			thumb = *a.Thumbnail
		}
		fmt.Printf("[%d] title=%q vtName=%q year=%q thumb=%q\n", i, a.Title, a.VtName, a.Year, thumb)
	}
}

func TestGetAlbum(t *testing.T) {
	data, err := GetAlbumData("the-legend-of-zelda-ocarina-of-time")
	if err != nil {
		t.Fatal("album error:", err)
	}
	fmt.Printf("Album: %s | Art: %d | Tracks: %d\n", data.Name, len(data.AlbumArt), len(data.Tracks))
	for i, tr := range data.Tracks {
		if i >= 5 {
			break
		}
		fmt.Printf("  [%d] %q -> %s\n", i, tr.Title, tr.Links.Ref)
	}
}

func TestAlbumDebug(t *testing.T) {
	doc, err := fetchDoc("https://downloads.khinsider.com/game-soundtracks/album/the-legend-of-zelda-ocarina-of-time")
	if err != nil {
		t.Fatal(err)
	}

	fmt.Println("=== Checking tr structure ===")
	doc.Find("tr").Each(func(i int, s *goquery.Selection) {
		if i >= 15 {
			return
		}
		cells := s.Find("td")
		first := strings.TrimSpace(cells.Eq(0).Text())
		second := strings.TrimSpace(cells.Eq(1).Text())
		href, _ := cells.Eq(1).Find("a").Attr("href")
		fmt.Printf("tr[%d]: cells=%d first=%q second=%q href=%q\n", i, cells.Length(), first, second, href)
	})
}
