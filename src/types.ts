type int = number

export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  destination: string
  filename: string
  path: string
  size: number
}

export interface PlaylistItem {
  id: string
  tags: string[]
}

export interface DrawcastData {
  settings: {
    canvasWidth: int
    canvasHeight: int
    submitButtonText: string
    submitConfirm: string
    customDescription: string
    palette: string
    displayDuration: int
    displayLatestForever: string
    displayLatestAutomatically: string
    notificationSound: string
    favorites: string[]
  }
  defaultSettings: any
  drawUrl: string
  images: any[]
}
