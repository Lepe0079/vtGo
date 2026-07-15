package main

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx      context.Context
	store    *Store
	dlFolder string
}

type ApiResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data"`
	Error   string `json:"error,omitempty"`
}

type DownloadProgress struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
	Percent  int    `json:"percent"`
	Status   string `json:"status"`
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.store = NewStore()

	if stored := a.store.GetBaseURL(); stored != "" {
		baseURL = stored
	}

	home, _ := os.UserHomeDir()
	a.dlFolder = filepath.Join(home, "Downloads")
}

func nowMillis() int64 {
	return time.Now().UnixMilli()
}

// --- Base URL ---

func (a *App) GetBaseURL() string {
	return a.store.GetBaseURL()
}

func (a *App) SetBaseURL(rawURL string) error {
	trimmed := strings.TrimSuffix(strings.TrimSpace(rawURL), "/")

	parsed, err := url.ParseRequestURI(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return fmt.Errorf("please enter a valid URL, e.g. https://example.com")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("URL must use http or https")
	}

	baseURL = trimmed
	a.store.SetBaseURL(trimmed)
	return nil
}

// --- Search ---

func (a *App) SearchAlbums(query string) ApiResponse[[]Album] {
	albums, err := SearchAlbum(query)
	if err != nil {
		return ApiResponse[[]Album]{Success: false, Error: err.Error()}
	}
	if albums == nil {
		albums = []Album{}
	}
	return ApiResponse[[]Album]{Success: true, Data: albums}
}

// --- Album ---

func (a *App) GetAlbum(vtname string) ApiResponse[AlbumData] {
	albumData, err := GetAlbumData(vtname)
	if err != nil {
		return ApiResponse[AlbumData]{Success: false, Error: err.Error()}
	}

	links := make([]string, 0, len(albumData.Tracks))
	for _, t := range albumData.Tracks {
		links = append(links, t.Links.Ref)
	}

	dlLinks, err := GetDownloadLinks(links)
	if err != nil {
		return ApiResponse[AlbumData]{Success: false, Error: err.Error()}
	}

	for i := range albumData.Tracks {
		if dl, ok := dlLinks[albumData.Tracks[i].Links.Ref]; ok {
			albumData.Tracks[i].Links.Download = &dl
		}
	}

	return ApiResponse[AlbumData]{Success: true, Data: albumData}
}

// --- Folder ---

func (a *App) GetFolder() string {
	return a.dlFolder
}

func (a *App) SelectFolder() string {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "Select Download Folder",
		DefaultDirectory: a.dlFolder,
	})
	if err != nil || dir == "" {
		return a.dlFolder
	}
	a.dlFolder = dir
	return dir
}

// --- Downloads ---

func (a *App) DownloadFiles(path string, tracks []string) {
	go func() {
		for i, track := range tracks {
			id := fmt.Sprintf("%d-%d", nowMillis(), i)
			filename := urlFilename(track)

			runtime.EventsEmit(a.ctx, "download-started", map[string]interface{}{
				"id": id, "filename": filename,
			})

			err := DownloadFile(a.ctx, track, path, func(percent int) {
				runtime.EventsEmit(a.ctx, "download-progress", DownloadProgress{
					ID: id, Filename: filename, Percent: percent, Status: "downloading",
				})
			})

			status := "completed"
			if err != nil {
				status = "error"
			}

			runtime.EventsEmit(a.ctx, "download-progress", DownloadProgress{
				ID: id, Filename: filename, Percent: 100, Status: status,
			})
		}

		runtime.EventsEmit(a.ctx, "download-batch-complete", nil)
	}()
}

func (a *App) DownloadSingle(trackURL string) {
	go func() {
		DownloadFile(a.ctx, trackURL, a.dlFolder, nil)
	}()
}

// --- Download History ---

func (a *App) GetDownloadHistory() []DownloadedAlbum {
	return a.store.GetDownloadHistory()
}

func (a *App) RecordAlbumDownload(album DownloadedAlbum) {
	a.store.RecordAlbumDownload(album)
}

func (a *App) GetAlbumDownloadedTracks(vtName string) []string {
	return a.store.GetAlbumDownloadedTracks(vtName)
}

func (a *App) ClearDownloadHistory() {
	a.store.ClearDownloadHistory()
}

// --- Search History ---

func (a *App) GetSearchHistory() []SearchHistoryItem {
	return a.store.GetSearchHistory()
}

func (a *App) AddSearchHistory(query string) []SearchHistoryItem {
	return a.store.AddSearchHistory(query)
}

func (a *App) ClearSearchHistory() {
	a.store.ClearSearchHistory()
}

// --- Bookmarks ---

func (a *App) GetBookmarks() []BookmarkedAlbum {
	return a.store.GetBookmarks()
}

func (a *App) IsBookmarked(vtName string) bool {
	return a.store.IsBookmarked(vtName)
}

func (a *App) AddBookmark(album BookmarkedAlbum) {
	a.store.AddBookmark(album)
}

func (a *App) RemoveBookmark(vtName string) {
	a.store.RemoveBookmark(vtName)
}
