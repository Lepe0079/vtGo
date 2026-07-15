import { useEffect, useState, FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { Music2 } from 'lucide-react'
import { SearchAlbums, ResolveCollectionMatch } from '../../wailsjs/go/main/App'
import { main } from '../../wailsjs/go/models'

interface ResolveMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: main.CollectionAlbum | null
  onResolved: (album: main.Album) => void
}

export default function ResolveMatchDialog({ open, onOpenChange, entry, onResolved }: ResolveMatchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<main.Album[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)

  const runSearch = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await SearchAlbums(q)
      if (result.success) {
        setResults(result.data ?? [])
      } else {
        setError(result.error || 'Search failed')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && entry) {
      setQuery(entry.folderName)
      setResults([])
      setError('')
      runSearch(entry.folderName)
    }
  }, [open, entry])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    runSearch(query)
  }

  const pick = async (album: main.Album) => {
    if (!entry) return
    setResolving(true)
    try {
      await ResolveCollectionMatch(entry.localPath, album)
      onResolved(album)
      onOpenChange(false)
    } catch (err) {
      setError(String(err))
    } finally {
      setResolving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Match "{entry?.folderName}"</DialogTitle>
          <DialogDescription>Search the catalog and pick the album this folder belongs to.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="h-10 flex-1 rounded-md border border-border bg-muted/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            className="px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-4 max-h-80 overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-muted-foreground py-4 text-center">Searching...</p>}
          {!loading &&
            results.map((album) => (
              <button
                key={album.vtName}
                type="button"
                disabled={resolving}
                onClick={() => pick(album)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                {album.thumbnail ? (
                  <img src={album.thumbnail} alt={album.title} className="w-10 h-10 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                    <Music2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{album.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {album.year}
                    {(album.platforms ?? []).length > 0 && ` · ${album.platforms[0]}`}
                  </p>
                </div>
              </button>
            ))}
          {!loading && results.length === 0 && !error && (
            <p className="text-sm text-muted-foreground py-4 text-center">No results</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
