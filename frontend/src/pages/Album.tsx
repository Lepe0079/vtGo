import { useEffect, useRef, useState, MouseEvent } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Download, Check, FolderOpen, Image, FolderPlus } from 'lucide-react'
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime'
import {
  GetAlbum,
  GetFolder,
  SelectFolder,
  DownloadFiles,
  DownloadSingle,
  RecordAlbumDownload,
  GetAlbumDownloadedTracks,
} from '../../wailsjs/go/main/App'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { main } from '../../wailsjs/go/models'

interface LocationState {
  search?: string
  albums?: main.Album[]
}

export default function Album() {
  const { vtname } = useParams<{ vtname: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LocationState | null
  const fetched = useRef<boolean>(false)

  const [album, setAlbum] = useState<main.AlbumData | null>(null)
  const [makeFolder, setMakeFolder] = useState<boolean>(false)
  const [dlFolder, setDlFolder] = useState<string>('')
  const [getArt, setGetArt] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [downloadedTracks, setDownloadedTracks] = useState<Set<string>>(new Set())

  const fetchAlbum = async (title: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await GetAlbum(title)

      if (result.success && result.data) {
        setAlbum(result.data)
      } else {
        setError(result.error || 'Failed to fetch album')
      }
    } catch (err) {
      console.error('Album fetch error:', err)
      setError('An error occurred while fetching album')
    } finally {
      setLoading(false)
      fetched.current = true
    }
  }

  // Load previously downloaded tracks
  useEffect(() => {
    if (vtname) {
      GetAlbumDownloadedTracks(vtname)
        .then((urls: string[]) => {
          if (urls.length > 0) setDownloadedTracks(new Set(urls))
        })
        .catch((err: Error) => console.error('Failed to load downloaded tracks:', err))
    }
  }, [vtname])

  useEffect(() => {
    if (!fetched.current && vtname) {
      fetchAlbum(vtname)
    }

    GetFolder()
      .then((folder: string) => setDlFolder(folder))
      .catch((err: Error) => console.error(err))

    // Track completed downloads
    const cancelProgress = EventsOn('download-progress', (data: { id: string; filename: string; status: string }) => {
      if (data.status === 'completed' && album) {
        const track = album.tracks.find((t) => {
          if (!t.links.download) return false
          const trackFilename = decodeURIComponent(t.links.download.split('/').pop() || '')
          return trackFilename === data.filename
        })
        if (track?.links.download) {
          setDownloadedTracks((prev) => new Set([...prev, track.links.download!]))
        }
      }
    })

    return () => {
      cancelProgress()
    }
  }, [vtname, album])

  const toggleTrack = (downloadUrl: string) => {
    setSelectedTracks((prev) => {
      const next = new Set(prev)
      if (next.has(downloadUrl)) {
        next.delete(downloadUrl)
      } else {
        next.add(downloadUrl)
      }
      return next
    })
  }

  const selectDownloadLocation = async () => {
    const folder = await SelectFolder()
    if (folder) setDlFolder(folder)
  }

  const downloadSingle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const target = e.currentTarget
    const downloadUrl = target.dataset.track
    if (downloadUrl) {
      DownloadSingle(downloadUrl)
    }
  }

  const downloadSelected = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    let tracksToDownload = Array.from(selectedTracks)
    if (getArt && album) {
      tracksToDownload = [...tracksToDownload, ...album.albumArt]
    }

    if (vtname && album && selectedTracks.size > 0) {
      RecordAlbumDownload({
        vtName: vtname,
        name: album.name,
        thumbnail: album.albumArt[0] || undefined,
        downloadedAt: Date.now(),
        lastDownloadedAt: Date.now(),
        trackCount: selectedTracks.size,
        downloadedTrackUrls: Array.from(selectedTracks),
      })
    }

    const path = makeFolder && album ? `${dlFolder}/${album.name}` : dlFolder
    DownloadFiles(path, tracksToDownload)
  }

  const getAllTrackUrls = () => {
    if (!album) return []
    return album.tracks.map((t) => t.links.download).filter((url): url is string => url !== undefined)
  }

  const toggleSelectAll = () => {
    const allUrls = getAllTrackUrls()
    if (selectedTracks.size === allUrls.length) {
      setSelectedTracks(new Set())
    } else {
      setSelectedTracks(new Set(allUrls))
    }
  }

  const isAllSelected = () => {
    const allUrls = getAllTrackUrls()
    return allUrls.length > 0 && selectedTracks.size === allUrls.length
  }

  const goBack = () => {
    navigate('/home', { state: locationState })
  }

  const trackCount = album?.tracks.filter((t) => t.links.download).length || 0
  const downloadedCount = downloadedTracks.size

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-muted-foreground">Loading album...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <button onClick={goBack} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center text-red-500 mt-10">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-muted/80 to-background p-6">
        <button
          onClick={goBack}
          className="p-2 -ml-2 rounded-full hover:bg-background/50 transition-colors mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
          <div className="shrink-0">
            {album?.albumArt[0] ? (
              <img
                className="w-48 h-48 object-cover rounded-md shadow-2xl"
                src={album.albumArt[0]}
                alt="Album Art"
              />
            ) : (
              <div className="w-48 h-48 bg-muted rounded-md flex items-center justify-center">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Album</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 truncate">{album?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {trackCount} tracks
              {downloadedCount > 0 && (
                <span className="text-green-500"> · {downloadedCount} downloaded</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-border">
        <Button
          onClick={downloadSelected}
          size="lg"
          className="rounded-full gap-2"
          disabled={selectedTracks.size === 0}
        >
          <Download className="h-5 w-5" />
          Download {selectedTracks.size > 0 ? `(${selectedTracks.size})` : ''}
        </Button>

        <div className="flex items-center gap-1">
          <Button
            onClick={selectDownloadLocation}
            variant="ghost"
            size="icon"
            className="rounded-full"
            title="Select Download Folder"
          >
            <FolderOpen className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => setGetArt(!getArt)}
            variant={getArt ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-full"
            title="Download Album Art"
          >
            <Image className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => setMakeFolder(!makeFolder)}
            variant={makeFolder ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-full"
            title="Create Album Folder"
          >
            <FolderPlus className="h-5 w-5" />
          </Button>
        </div>

        <span className="text-xs text-muted-foreground ml-auto truncate max-w-xs" title={dlFolder}>
          {dlFolder}
        </span>
      </div>

      {/* Track List */}
      <div className="px-6">
        <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
          <div className="w-12 flex items-center justify-center">
            <Checkbox checked={isAllSelected()} onCheckedChange={toggleSelectAll} />
          </div>
          <div># Title</div>
          <div className="w-10"></div>
        </div>

        <div className="divide-y divide-border/50">
          {album?.tracks.map((track: main.Track, idx: number) => {
            const downloadUrl = track.links.download
            if (!downloadUrl) return null
            const isDownloaded = downloadedTracks.has(downloadUrl)
            const isSelected = selectedTracks.has(downloadUrl)

            return (
              <div
                key={idx}
                className={`grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 items-center group hover:bg-muted/50 transition-colors rounded-md ${
                  isDownloaded ? 'bg-green-500/5' : ''
                }`}
              >
                <div className="w-12 flex items-center justify-center">
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleTrack(downloadUrl)} />
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{idx + 1}</span>
                  <span className={`text-sm truncate ${isSelected ? 'text-primary font-medium' : ''}`}>
                    {track.title}
                  </span>
                  {isDownloaded && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                </div>

                <div className="w-10 flex justify-end">
                  <button
                    className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                    data-track={downloadUrl}
                    onClick={downloadSingle}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
