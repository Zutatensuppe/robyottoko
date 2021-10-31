type int = number

export interface Config {
  secret: string
  log: {
    level: 'info' | 'debug'
  }
  twitch: {
    eventSub: {
      transport: {
        method: string // 'webhook'
        callback: string
        secret: string
      }
    }
    tmi: {
      identity: {
        client_id: string
        client_secret: string
        username: string
        password: string
      }
    }
  }
  mail: {
    sendinblue_api_key: string
  }
  http: {
    hostname: string
    port: int
    url: string
  }
  ws: {
    hostname: string
    port: int
    connectstring: string
  },
  db: {
    file: string
    patchesDir: string
  },
  modules: {
    sr: {
      google: {
        api_key: string
      }
    },
    speechToText: {
      google: {
        scriptId: string
      }
    }
  }
}

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
