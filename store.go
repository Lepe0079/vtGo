package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

type DownloadedAlbum struct {
	VtName              string   `json:"vtName"`
	Name                string   `json:"name"`
	Thumbnail           *string  `json:"thumbnail"`
	DownloadedAt        int64    `json:"downloadedAt"`
	LastDownloadedAt    int64    `json:"lastDownloadedAt"`
	TrackCount          int      `json:"trackCount"`
	DownloadedTrackUrls []string `json:"downloadedTrackUrls"`
}

type SearchHistoryItem struct {
	Query     string `json:"query"`
	Timestamp int64  `json:"timestamp"`
}

type BookmarkedAlbum struct {
	VtName       string  `json:"vtName"`
	Name         string  `json:"name"`
	Thumbnail    *string `json:"thumbnail"`
	BookmarkedAt int64   `json:"bookmarkedAt"`
}

type storeData struct {
	DownloadHistory []DownloadedAlbum   `json:"downloadHistory"`
	SearchHistory   []SearchHistoryItem `json:"searchHistory"`
	Bookmarks       []BookmarkedAlbum   `json:"bookmarks"`
	BaseURL         string              `json:"baseURL"`
}

type Store struct {
	path string
	data storeData
}

func NewStore() *Store {
	dir, _ := os.UserConfigDir()
	path := filepath.Join(dir, "vtGo", "store.json")
	os.MkdirAll(filepath.Dir(path), 0755)

	s := &Store{path: path}
	s.load()
	return s
}

func (s *Store) load() {
	b, err := os.ReadFile(s.path)
	if err != nil {
		s.data = storeData{
			DownloadHistory: []DownloadedAlbum{},
			SearchHistory:   []SearchHistoryItem{},
		}
		return
	}
	if err := json.Unmarshal(b, &s.data); err != nil {
		s.data = storeData{}
	}
	if s.data.DownloadHistory == nil {
		s.data.DownloadHistory = []DownloadedAlbum{}
	}
	if s.data.SearchHistory == nil {
		s.data.SearchHistory = []SearchHistoryItem{}
	}
	if s.data.Bookmarks == nil {
		s.data.Bookmarks = []BookmarkedAlbum{}
	}
}

func (s *Store) save() {
	b, _ := json.MarshalIndent(s.data, "", "  ")
	os.WriteFile(s.path, b, 0644)
}

func (s *Store) GetDownloadHistory() []DownloadedAlbum {
	return s.data.DownloadHistory
}

func (s *Store) RecordAlbumDownload(album DownloadedAlbum) {
	for i, a := range s.data.DownloadHistory {
		if a.VtName == album.VtName {
			s.data.DownloadHistory[i].LastDownloadedAt = album.LastDownloadedAt
			s.data.DownloadHistory[i].TrackCount += album.TrackCount
			existing := make(map[string]bool)
			for _, u := range s.data.DownloadHistory[i].DownloadedTrackUrls {
				existing[u] = true
			}
			for _, u := range album.DownloadedTrackUrls {
				if !existing[u] {
					s.data.DownloadHistory[i].DownloadedTrackUrls = append(
						s.data.DownloadHistory[i].DownloadedTrackUrls, u,
					)
				}
			}
			s.save()
			return
		}
	}
	s.data.DownloadHistory = append([]DownloadedAlbum{album}, s.data.DownloadHistory...)
	s.save()
}

func (s *Store) GetAlbumDownloadedTracks(vtName string) []string {
	for _, a := range s.data.DownloadHistory {
		if a.VtName == vtName {
			if a.DownloadedTrackUrls == nil {
				return []string{}
			}
			return a.DownloadedTrackUrls
		}
	}
	return []string{}
}

func (s *Store) ClearDownloadHistory() {
	s.data.DownloadHistory = []DownloadedAlbum{}
	s.save()
}

func (s *Store) GetSearchHistory() []SearchHistoryItem {
	return s.data.SearchHistory
}

func (s *Store) AddSearchHistory(query string) []SearchHistoryItem {
	filtered := make([]SearchHistoryItem, 0, len(s.data.SearchHistory))
	for _, item := range s.data.SearchHistory {
		if !strings.EqualFold(item.Query, query) {
			filtered = append(filtered, item)
		}
	}
	filtered = append([]SearchHistoryItem{{Query: query, Timestamp: nowMillis()}}, filtered...)
	if len(filtered) > 10 {
		filtered = filtered[:10]
	}
	s.data.SearchHistory = filtered
	s.save()
	return s.data.SearchHistory
}

func (s *Store) ClearSearchHistory() {
	s.data.SearchHistory = []SearchHistoryItem{}
	s.save()
}

func (s *Store) GetBaseURL() string {
	return s.data.BaseURL
}

func (s *Store) SetBaseURL(url string) {
	s.data.BaseURL = url
	s.save()
}

func (s *Store) GetBookmarks() []BookmarkedAlbum {
	return s.data.Bookmarks
}

func (s *Store) IsBookmarked(vtName string) bool {
	for _, b := range s.data.Bookmarks {
		if b.VtName == vtName {
			return true
		}
	}
	return false
}

func (s *Store) AddBookmark(album BookmarkedAlbum) {
	for _, b := range s.data.Bookmarks {
		if b.VtName == album.VtName {
			return
		}
	}
	s.data.Bookmarks = append([]BookmarkedAlbum{album}, s.data.Bookmarks...)
	s.save()
}

func (s *Store) RemoveBookmark(vtName string) {
	filtered := make([]BookmarkedAlbum, 0, len(s.data.Bookmarks))
	for _, b := range s.data.Bookmarks {
		if b.VtName != vtName {
			filtered = append(filtered, b)
		}
	}
	s.data.Bookmarks = filtered
	s.save()
}
