import { useState, useEffect, useMemo, useRef, FormEvent, ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Clock,
  Music2,
  AlertCircle,
  Settings,
  ArrowUpDown,
  Bookmark,
  Library,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  SearchAlbums,
  GetDownloadHistory,
  GetSearchHistory,
  AddSearchHistory,
  ClearSearchHistory,
  GetBookmarks,
  GetCollection,
  GetLibraryFolder,
  SelectLibraryFolder,
  ScanLibrary,
  RemoveCollectionEntry,
} from '../../wailsjs/go/main/App'
import { main } from '../../wailsjs/go/models'
import ResolveMatchDialog from '../components/ResolveMatchDialog'

type Status = 'idle' | 'loading' | 'done' | 'error'
type SortBy = 'title' | 'date' | 'system'
type LibraryTab = 'recent' | 'bookmarks' | 'collection'

interface LocationState {
  search?: string
  albums?: main.Album[]
}

interface HomeProps {
  baseUrl: string
  onOpenBaseUrlSettings: () => void
}

export default function Home({ baseUrl, onOpenBaseUrlSettings }: HomeProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null

  const [search, setSearch] = useState<string>(state?.search || '')
  const [albums, setAlbums] = useState<main.Album[]>(state?.albums || [])
  const [status, setStatus] = useState<Status>(state?.albums?.length ? 'done' : 'idle')
  const [error, setError] = useState<string>('')
  const [downloadHistory, setDownloadHistory] = useState<main.DownloadedAlbum[]>([])
  const [bookmarks, setBookmarks] = useState<main.BookmarkedAlbum[]>([])
  const [collection, setCollection] = useState<main.CollectionAlbum[]>([])
  const [libraryFolder, setLibraryFolder] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const [resolveEntry, setResolveEntry] = useState<main.CollectionAlbum | null>(null)
  const [searchHistory, setSearchHistory] = useState<main.SearchHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('title')
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('recent')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    GetDownloadHistory().then(setDownloadHistory).catch(console.error)
    GetBookmarks().then(setBookmarks).catch(console.error)
    GetCollection().then(setCollection).catch(console.error)
    GetLibraryFolder().then(setLibraryFolder).catch(console.error)
    GetSearchHistory().then(setSearchHistory).catch(console.error)
  }, [])

  const changeLibraryFolder = () => {
    SelectLibraryFolder().then(setLibraryFolder).catch(console.error)
  }

  const scanLibrary = async () => {
    setScanning(true)
    try {
      const result = await ScanLibrary()
      if (result.success) {
        setCollection(result.data ?? [])
      } else {
        console.error(result.error)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setScanning(false)
    }
  }

  const removeCollectionEntry = (localPath: string) => {
    RemoveCollectionEntry(localPath).catch(console.error)
    setCollection((prev) => prev.filter((c) => c.localPath !== localPath))
  }

  const handleCollectionCardClick = (album: main.CollectionAlbum) => {
    if (album.matched) {
      navigate(`/album/${album.vtName}`)
    } else {
      setResolveEntry(album)
    }
  }

  const handleResolved = () => {
    if (!resolveEntry) return
    GetCollection().then(setCollection).catch(console.error)
    setResolveEntry(null)
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const sortedAlbums = useMemo(() => {
    const sorted = [...albums]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0)
        case 'system':
          return (a.platforms?.[0] ?? '').localeCompare(b.platforms?.[0] ?? '')
        case 'title':
        default:
          return a.title.localeCompare(b.title)
      }
    })
    return sorted
  }, [albums, sortBy])

  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setStatus('loading')
    setError('')
    setAlbums([])

    try {
      console.log('[vtGo] searching for:', query)
      const result = await SearchAlbums(query)
      console.log('[vtGo] search result:', JSON.stringify(result))

      if (result.success) {
        setAlbums(result.data ?? [])
        setStatus('done')
        AddSearchHistory(query).then(setSearchHistory).catch(console.error)
      } else {
        setError(result.error || 'Search failed')
        setStatus('error')
      }
    } catch (err) {
      console.error('[vtGo] search exception:', err)
      setError(String(err))
      setStatus('error')
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    performSearch(search)
  }

  const handleHistoryClick = (query: string) => {
    setSearch(query)
    setShowHistory(false)
    performSearch(query)
  }

  const clearSearchHistory = () => {
    ClearSearchHistory().catch(console.error)
    setSearchHistory([])
    setShowHistory(false)
  }

  const reset = () => {
    setSearch('')
    setAlbums([])
    setError('')
    setStatus('idle')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Search Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            <form onSubmit={handleSubmit} className="relative flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                  placeholder="What do you want to download?"
                  className="w-full h-10 pl-10 pr-10 rounded-full bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={reset}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Search History Dropdown */}
              {showHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-30">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                      onClick={() => handleHistoryClick(item.query)}
                    >
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{item.query}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>
            <button
              type="button"
              onClick={onOpenBaseUrlSettings}
              title={`Change base URL (currently: ${baseUrl})`}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">

        {/* Loading */}
        {status === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Searching...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="text-red-400 text-sm max-w-sm">{error}</p>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {status === 'done' && albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Search Results</h2>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortBy)}
                  className="h-8 pl-3 pr-8 rounded-full bg-muted/50 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option value="title">Title</option>
                  <option value="date">Date</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortedAlbums.map((album) => (
                <button
                  key={album.vtName}
                  onClick={() => navigate(`/album/${album.vtName}`, { state: { search, albums } })}
                  className="group p-4 rounded-lg bg-card/50 hover:bg-card transition-all duration-200 text-left"
                >
                  <div className="relative aspect-square mb-3">
                    {album.thumbnail ? (
                      <img
                        src={album.thumbnail}
                        alt={album.title}
                        className="w-full h-full object-cover rounded-md shadow-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                        <Music2 className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {album.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {album.year}
                    {(album.platforms ?? []).length > 0 && ` · ${album.platforms[0]}`}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* No results */}
        {status === 'done' && albums.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <Search className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">No results for "{search}"</h2>
            <p className="text-muted-foreground text-sm">Try a different search term</p>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Welcome / idle */}
        {status === 'idle' && downloadHistory.length === 0 && bookmarks.length === 0 && collection.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Search for soundtracks</h2>
            <p className="text-muted-foreground text-sm">Find and download video game music</p>
          </div>
        )}

        {/* Library tabs (Recently Downloaded / Bookmarked / Collection) */}
        {(downloadHistory.length > 0 || bookmarks.length > 0 || collection.length > 0) &&
          status !== 'loading' &&
          albums.length === 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setLibraryTab('recent')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  libraryTab === 'recent'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                Recently Downloaded
              </button>
              <button
                type="button"
                onClick={() => setLibraryTab('bookmarks')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  libraryTab === 'bookmarks'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                Bookmarked
              </button>
              <button
                type="button"
                onClick={() => setLibraryTab('collection')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  libraryTab === 'collection'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                Collection
              </button>
            </div>

            {libraryTab === 'recent' && (
              downloadHistory.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {downloadHistory.map((album) => (
                    <button
                      key={album.vtName}
                      onClick={() => navigate(`/album/${album.vtName}`)}
                      className="group p-4 rounded-lg bg-card/50 hover:bg-card transition-all duration-200 text-left"
                    >
                      <div className="relative aspect-square mb-3">
                        {album.thumbnail ? (
                          <img src={album.thumbnail} alt={album.name} className="w-full h-full object-cover rounded-md shadow-lg" />
                        ) : (
                          <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                            <Music2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {album.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {album.trackCount} tracks · {formatDate(album.lastDownloadedAt)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <Music2 className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm">No downloads yet</p>
                </div>
              )
            )}

            {libraryTab === 'bookmarks' && (
              bookmarks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {bookmarks.map((album) => (
                    <button
                      key={album.vtName}
                      onClick={() => navigate(`/album/${album.vtName}`)}
                      className="group p-4 rounded-lg bg-card/50 hover:bg-card transition-all duration-200 text-left"
                    >
                      <div className="relative aspect-square mb-3">
                        {album.thumbnail ? (
                          <img src={album.thumbnail} alt={album.name} className="w-full h-full object-cover rounded-md shadow-lg" />
                        ) : (
                          <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                            <Music2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {album.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Bookmark className="h-3 w-3 fill-current" /> {formatDate(album.bookmarkedAt)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <Bookmark className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm">No bookmarked albums yet</p>
                </div>
              )
            )}

            {libraryTab === 'collection' && (
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                  <span className="text-muted-foreground truncate max-w-xs" title={libraryFolder}>
                    {libraryFolder}
                  </span>
                  <button
                    type="button"
                    onClick={changeLibraryFolder}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors text-xs font-medium"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Change Folder
                  </button>
                  <button
                    type="button"
                    onClick={scanLibrary}
                    disabled={scanning}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    {scanning ? 'Scanning...' : 'Scan'}
                  </button>
                </div>

                {collection.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {collection.map((album) => (
                      <div key={album.localPath} className="group relative p-4 rounded-lg bg-card/50 hover:bg-card transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => removeCollectionEntry(album.localPath)}
                          title="Remove from collection"
                          className="absolute top-1 left-1 z-10 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleCollectionCardClick(album)} className="w-full text-left">
                          <div className="relative aspect-square mb-3">
                            {album.matched && album.thumbnail ? (
                              <img
                                src={album.thumbnail}
                                alt={album.name}
                                className="w-full h-full object-cover rounded-md shadow-lg"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                                <Music2 className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            <div
                              className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5"
                              title={album.matched ? 'Matched to catalog' : 'No match found — click to resolve'}
                            >
                              {album.matched ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-400" />
                              )}
                            </div>
                          </div>
                          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {album.matched ? album.name : album.folderName}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {album.trackCount} tracks · Added {formatDate(album.addedAt)}
                          </p>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                    <Library className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">No albums in your collection yet</p>
                    <p className="text-muted-foreground text-xs">Scan your music folder to get started</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <ResolveMatchDialog
          open={resolveEntry !== null}
          onOpenChange={(open) => !open && setResolveEntry(null)}
          entry={resolveEntry}
          onResolved={handleResolved}
        />

      </div>
    </div>
  )
}
