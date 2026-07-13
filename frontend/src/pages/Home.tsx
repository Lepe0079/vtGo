import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, X, Clock, Music2, AlertCircle, Settings } from 'lucide-react'
import logo from '../assets/images/logo-universal.png'
import {
  SearchAlbums,
  GetDownloadHistory,
  GetSearchHistory,
  AddSearchHistory,
  ClearSearchHistory,
} from '../../wailsjs/go/main/App'
import { main } from '../../wailsjs/go/models'

type Status = 'idle' | 'loading' | 'done' | 'error'

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
  const [searchHistory, setSearchHistory] = useState<main.SearchHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    GetDownloadHistory().then(setDownloadHistory).catch(console.error)
    GetSearchHistory().then(setSearchHistory).catch(console.error)
  }, [])

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

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
          <div className="flex items-center gap-2 mb-3">
            <img src={logo} alt="vtGo" className="h-6 w-6 rounded" />
            <span className="font-semibold text-sm">vtGo</span>
            <button
              type="button"
              onClick={onOpenBaseUrlSettings}
              title={`Change base URL (currently: ${baseUrl})`}
              className="ml-auto p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="relative max-w-md">
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
            <h2 className="text-2xl font-bold mb-4">Search Results</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {albums.map((album) => (
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
        {status === 'idle' && downloadHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Search for soundtracks</h2>
            <p className="text-muted-foreground text-sm">Find and download video game music</p>
          </div>
        )}

        {/* Recently Downloaded — always show when available */}
        {downloadHistory.length > 0 && status !== 'loading' && albums.length === 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Recently Downloaded</h2>
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
          </section>
        )}

      </div>
    </div>
  )
}
