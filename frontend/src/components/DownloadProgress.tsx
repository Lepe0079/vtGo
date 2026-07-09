import { useState, useEffect } from 'react'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import { ChevronUp, ChevronDown, Check, AlertCircle, Download, Loader2 } from 'lucide-react'
import { Progress } from './ui/progress'
import type { IDownloadProgress } from '../types'

export default function DownloadProgress() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [downloads, setDownloads] = useState<IDownloadProgress[]>([])

  useEffect(() => {
    const cancelStarted = EventsOn('download-started', (data: { id: string; filename: string }) => {
      setDownloads((prev) => [
        ...prev,
        { id: data.id, filename: data.filename, percent: 0, status: 'pending' },
      ])
      setIsExpanded(true)
    })

    const cancelProgress = EventsOn('download-progress', (data: IDownloadProgress) => {
      setDownloads((prev) =>
        prev.map((dl) =>
          dl.id === data.id ? { ...dl, percent: data.percent, status: data.status } : dl
        )
      )
    })

    const cancelBatch = EventsOn('download-batch-complete', () => {
      // Keep completed downloads visible
    })

    return () => {
      cancelStarted()
      cancelProgress()
      cancelBatch()
    }
  }, [])

  const clearCompleted = () => {
    setDownloads((prev) => prev.filter((dl) => dl.status !== 'completed' && dl.status !== 'error'))
  }

  const clearAll = () => {
    setDownloads([])
  }

  const activeDownloads = downloads.filter((dl) => dl.status === 'downloading' || dl.status === 'pending')
  const completedDownloads = downloads.filter((dl) => dl.status === 'completed')
  const currentDownload =
    downloads.find((dl) => dl.status === 'downloading') || downloads.find((dl) => dl.status === 'pending')

  if (downloads.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {isExpanded && (
        <div className="bg-card/95 backdrop-blur-md border-t border-border shadow-2xl max-h-72 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Downloads Queue
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={clearCompleted}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear completed
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {downloads.map((dl) => (
              <div
                key={dl.id}
                className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors ${
                  dl.status === 'downloading' ? 'bg-primary/5' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  {dl.status === 'completed' && <Check className="h-4 w-4 text-green-500" />}
                  {dl.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {dl.status === 'downloading' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                  {dl.status === 'pending' && <Download className="h-4 w-4 text-muted-foreground" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" title={dl.filename}>
                    {dl.filename}
                  </p>
                  {(dl.status === 'downloading' || dl.status === 'pending') && (
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={dl.percent} className="h-1 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{dl.percent}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border-t border-border">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
              {activeDownloads.length > 0 ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Check className="h-5 w-5 text-green-500" />
              )}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium truncate">
                {currentDownload?.filename || 'Downloads complete'}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeDownloads.length > 0
                  ? `${activeDownloads.length} downloading · ${completedDownloads.length} completed`
                  : `${completedDownloads.length} files downloaded`}
              </p>
            </div>
          </div>

          {currentDownload && (
            <div className="hidden sm:flex items-center gap-2 w-48">
              <Progress value={currentDownload.percent} className="h-1 flex-1" />
              <span className="text-xs text-muted-foreground w-8">{currentDownload.percent}%</span>
            </div>
          )}

          <div className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>
      </div>
    </div>
  )
}
