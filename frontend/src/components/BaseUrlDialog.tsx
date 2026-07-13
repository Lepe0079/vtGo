import { useEffect, useState, FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { SetBaseURL } from '../../wailsjs/go/main/App'

interface BaseUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUrl: string
  required?: boolean
  onSaved: (url: string) => void
}

export default function BaseUrlDialog({
  open,
  onOpenChange,
  currentUrl,
  required = false,
  onSaved,
}: BaseUrlDialogProps) {
  const [value, setValue] = useState(currentUrl)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(currentUrl)
      setError('')
    }
  }, [open, currentUrl])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await SetBaseURL(value.trim())
      onSaved(value.trim())
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={required ? undefined : onOpenChange}>
      <DialogContent
        hideClose={required}
        onInteractOutside={(e) => required && e.preventDefault()}
        onEscapeKeyDown={(e) => required && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{required ? 'Welcome to vtGo' : 'Change Base URL'}</DialogTitle>
          <DialogDescription>
            {required
              ? 'Enter the base URL vtGo should use to search for and download soundtracks.'
              : 'Update the base URL vtGo uses to search for and download soundtracks.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            className="h-10 w-full rounded-md border border-border bg-muted/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !value.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
