package main

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

type ProgressFunc func(percent int)

func DownloadFile(ctx context.Context, rawURL string, destDir string, onProgress ProgressFunc) error {
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}

	filename := urlFilename(rawURL)
	destPath := filepath.Join(destDir, filename)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	f, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer f.Close()

	total := resp.ContentLength
	if total <= 0 || onProgress == nil {
		_, err = io.Copy(f, resp.Body)
		return err
	}

	var written int64
	buf := make([]byte, 32*1024)
	lastPct := -1

	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := f.Write(buf[:n]); werr != nil {
				return werr
			}
			written += int64(n)
			pct := int(float64(written) / float64(total) * 100)
			if pct != lastPct {
				lastPct = pct
				onProgress(pct)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}

	return nil
}

func urlFilename(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "track.mp3"
	}
	parts := strings.Split(parsed.Path, "/")
	if len(parts) == 0 {
		return "track.mp3"
	}
	name, err := url.PathUnescape(parts[len(parts)-1])
	if err != nil || name == "" {
		return parts[len(parts)-1]
	}
	return name
}
