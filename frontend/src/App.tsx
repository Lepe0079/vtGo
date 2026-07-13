import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Album from './pages/Album'
import DownloadProgress from './components/DownloadProgress'
import BaseUrlDialog from './components/BaseUrlDialog'
import { GetBaseURL } from '../wailsjs/go/main/App'

function App() {
  const [baseUrl, setBaseUrl] = useState('')
  const [ready, setReady] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [firstRun, setFirstRun] = useState(false)

  useEffect(() => {
    GetBaseURL().then((url) => {
      setBaseUrl(url)
      if (!url) {
        setFirstRun(true)
        setDialogOpen(true)
      }
      setReady(true)
    })
  }, [])

  const handleSaved = (url: string) => {
    setBaseUrl(url)
    setFirstRun(false)
    setDialogOpen(false)
  }

  if (!ready) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pb-20">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route
            path="/home"
            element={<Home baseUrl={baseUrl} onOpenBaseUrlSettings={() => setDialogOpen(true)} />}
          />
          <Route path="/album/:vtname" element={<Album />} />
        </Routes>
      </main>
      <DownloadProgress />
      <BaseUrlDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentUrl={baseUrl}
        required={firstRun}
        onSaved={handleSaved}
      />
    </div>
  )
}

export default App
