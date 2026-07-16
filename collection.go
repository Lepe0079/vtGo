package main

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var audioExtensions = map[string]bool{
	".mp3":  true,
	".flac": true,
	".wav":  true,
	".m4a":  true,
	".ogg":  true,
	".aac":  true,
	".wma":  true,
	".opus": true,
	".ape":  true,
}

type CollectionAlbum struct {
	LocalPath  string  `json:"localPath"`
	FolderName string  `json:"folderName"`
	TrackCount int     `json:"trackCount"`
	AddedAt    int64   `json:"addedAt"`
	Matched    bool    `json:"matched"`
	VtName     string  `json:"vtName,omitempty"`
	Name       string  `json:"name,omitempty"`
	Thumbnail  *string `json:"thumbnail,omitempty"`
}

// countAudioFiles walks root up to maxDepth levels deep and counts files with a
// recognized audio extension, so multi-disc folders (CD1/CD2 subfolders) are
// still counted correctly.
func countAudioFiles(root string, maxDepth int) int {
	count := 0
	var walk func(dir string, depth int)
	walk = func(dir string, depth int) {
		entries, err := os.ReadDir(dir)
		if err != nil {
			return
		}
		for _, entry := range entries {
			if entry.IsDir() {
				if depth < maxDepth {
					walk(filepath.Join(dir, entry.Name()), depth+1)
				}
				continue
			}
			if audioExtensions[strings.ToLower(filepath.Ext(entry.Name()))] {
				count++
			}
		}
	}
	walk(root, 0)
	return count
}

// VerifyCollectionEntries checks each existing collection entry against disk,
// refreshing its track count and dropping any entry whose folder is gone or no
// longer contains audio files. It returns the surviving entries plus the local
// paths of any that were dropped.
func VerifyCollectionEntries(entries []CollectionAlbum) (kept []CollectionAlbum, removed []string) {
	kept = make([]CollectionAlbum, 0, len(entries))
	for _, e := range entries {
		info, err := os.Stat(e.LocalPath)
		if err != nil || !info.IsDir() {
			removed = append(removed, e.LocalPath)
			continue
		}
		count := countAudioFiles(e.LocalPath, 3)
		if count == 0 {
			removed = append(removed, e.LocalPath)
			continue
		}
		e.TrackCount = count
		kept = append(kept, e)
	}
	return kept, removed
}

// ScanLibraryFolder looks at the immediate subdirectories of root, skipping any
// path present in knownPaths (already in the collection or explicitly ignored)
// and any folder with no audio files. Each remaining folder is matched against
// the scraped catalog concurrently, taking the first search result as the
// best-guess match.
func ScanLibraryFolder(root string, knownPaths map[string]bool) ([]CollectionAlbum, error) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, err
	}

	type candidate struct {
		name string
		path string
	}

	var candidates []candidate
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		path := filepath.Join(root, entry.Name())
		if knownPaths[path] {
			continue
		}
		if countAudioFiles(path, 3) == 0 {
			continue
		}
		candidates = append(candidates, candidate{name: entry.Name(), path: path})
	}

	const maxConcurrent = 10
	results := make([]CollectionAlbum, len(candidates))
	var wg sync.WaitGroup
	sem := make(chan struct{}, maxConcurrent)

	for i, c := range candidates {
		wg.Add(1)
		sem <- struct{}{}

		go func(i int, c candidate) {
			defer wg.Done()
			defer func() { <-sem }()

			album := CollectionAlbum{
				LocalPath:  c.path,
				FolderName: c.name,
				TrackCount: countAudioFiles(c.path, 3),
				AddedAt:    nowMillis(),
			}

			matches, err := SearchAlbum(c.name)
			if err == nil && len(matches) > 0 {
				top := matches[0]
				album.Matched = true
				album.VtName = top.VtName
				album.Name = top.Title
				album.Thumbnail = top.Thumbnail
			}

			results[i] = album
		}(i, c)
	}

	wg.Wait()

	return results, nil
}
