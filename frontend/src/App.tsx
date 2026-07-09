import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Album from './pages/Album'
import DownloadProgress from './components/DownloadProgress'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pb-20">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/album/:vtname" element={<Album />} />
        </Routes>
      </main>
      <DownloadProgress />
    </div>
  )
}

export default App
