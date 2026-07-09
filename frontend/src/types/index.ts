export interface ITrack {
  title: string
  links: {
    ref: string
    download?: string
  }
}

export interface IAlbum {
  title: string
  vtName: string
  thumbnail: string | undefined
  platforms: string[]
  year: string
  link: string
}

export interface IAlbumData {
  name: string
  albumArt: string[]
  tracks: ITrack[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface IDownloadedAlbum {
  vtName: string
  name: string
  thumbnail: string | undefined
  downloadedAt: number
  lastDownloadedAt: number
  trackCount: number
  downloadedTrackUrls: string[]
}

export interface IDownloadProgress {
  id: string
  filename: string
  percent: number
  status: 'pending' | 'downloading' | 'completed' | 'error'
}

export interface ISearchHistoryItem {
  query: string
  timestamp: number
}
