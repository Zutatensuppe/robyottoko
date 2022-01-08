import Db from '../../Db'
import fn, { logger } from '../../fn'
import fs from 'fs'
import WebServer from '../../WebServer'
import WebSocketServer, { Socket } from '../../net/WebSocketServer'
import Tokens from '../../services/Tokens'
import Variables from '../../services/Variables'
import { ChatMessageContext, DrawcastSettings, RewardRedemptionContext } from '../../types'
import ModuleStorage from '../ModuleStorage'
import { User } from '../../services/Users'
import Cache from '../../services/Cache'
import TwitchClientManager from '../../net/TwitchClientManager'
import TwitchChannels from '../../services/TwitchChannels'

const log = logger('DrawcastModule.ts')

interface PostEventData {
  event: 'post'
  data: {
    img: string
  }
}

export interface DrawcastSaveEventData {
  event: "save"
  settings: DrawcastSettings
}

class DrawcastModule {
  public name = 'drawcast'
  public variables: Variables

  private user: User
  private wss: WebSocketServer
  private storage: ModuleStorage
  private ws: WebServer
  private tokens: Tokens

  private defaultSettings = {
    submitButtonText: 'Submit',
    submitConfirm: '', // leave empty to not require confirm
    favoriteImagesTitle: '',
    recentImagesTitle: '',
    canvasWidth: 720,
    canvasHeight: 405,
    customDescription: '',
    customProfileImage: null,
    palette: [
      // row 1
      '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
      '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',

      // row 2
      '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
      '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
    ],
    displayDuration: 5000,
    displayLatestForever: false,
    displayLatestAutomatically: false,
    notificationSound: null,
    favorites: [],
  }
  private data: { settings: DrawcastSettings }
  private images: string[]

  constructor(
    db: Db,
    user: User,
    twitchChannelRepo: TwitchChannels,
    variables: Variables,
    clientManager: TwitchClientManager,
    storage: ModuleStorage,
    cache: Cache,
    ws: WebServer,
    wss: WebSocketServer,
  ) {
    this.variables = variables
    this.user = user
    this.wss = wss
    this.storage = storage

    this.ws = ws
    this.tokens = new Tokens(db)
    this.data = this.reinit()

    this.images = this.loadAllImages().slice(0, 20)
  }

  loadAllImages() {
    try {
      // todo: probably better to store latest x images in db
      const rel = `/uploads/drawcast/${this.user.id}`
      const path = `./data${rel}`
      return fs.readdirSync(path)
        .map((name) => ({
          name: name,
          time: fs.statSync(path + '/' + name).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)
        .map((v) => `${rel}/${v.name}`)
    } catch (e) {
      return []
    }
  }

  saveCommands() {
    // pass
  }

  reinit() {
    const data = this.storage.load(this.name, {
      settings: this.defaultSettings
    })
    if (!data.settings.palette) {
      data.settings.palette = this.defaultSettings.palette
    }
    if (!data.settings.displayDuration) {
      data.settings.displayDuration = this.defaultSettings.displayDuration
    }
    if (typeof data.settings.customProfileImage === 'undefined') {
      data.settings.customProfileImage = this.defaultSettings.customProfileImage
    }
    if (!data.settings.notificationSound) {
      data.settings.notificationSound = this.defaultSettings.notificationSound
    }
    if (!data.settings.displayLatestForever) {
      data.settings.displayLatestForever = this.defaultSettings.displayLatestForever
    }
    if (!data.settings.displayLatestAutomatically) {
      data.settings.displayLatestAutomatically = this.defaultSettings.displayLatestAutomatically
    }
    if (typeof data.settings.favoriteImagesTitle === 'undefined') {
      data.settings.favoriteImagesTitle = this.defaultSettings.favoriteImagesTitle
    }
    if (typeof data.settings.recentImagesTitle === 'undefined') {
      data.settings.recentImagesTitle = this.defaultSettings.recentImagesTitle
    }
    if (!data.settings.favorites) {
      data.settings.favorites = []
    }
    return {
      settings: data.settings
    }
  }

  widgets() {
    return {
    }
  }

  getRoutes() {
    return {
      get: {
        '/api/drawcast/all-images/': async (req: any, res: any, next: Function) => {
          const images = this.loadAllImages()
          res.send(images)
        },
      },
    }
  }

  drawUrl() {
    const pubToken = this.tokens.getPubTokenForUserId(this.user.id).token
    return this.ws.pubUrl(this.ws.widgetUrl('drawcast_draw', pubToken))
  }

  wsdata(eventName: string) {
    return {
      event: eventName,
      data: Object.assign({}, this.data, {
        defaultSettings: this.defaultSettings,
        drawUrl: this.drawUrl(),
        images: this.images
      }),
    };
  }

  updateClient(eventName: string, ws: Socket) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName: string) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  getWsEvents() {
    return {
      'conn': (ws: Socket) => {
        this.updateClient('init', ws)
      },
      'post': (ws: Socket, data: PostEventData) => {
        const rel = `/uploads/drawcast/${this.user.id}`
        const img = fn.decodeBase64Image(data.data.img)
        const name = `${(new Date()).toJSON()}-${fn.nonce(6)}.${fn.mimeToExt(img.type)}`
        const path = `./data${rel}`
        const imgpath = `${path}/${name}`
        const imgurl = `${rel}/${name}`
        fs.mkdirSync(path, { recursive: true })
        fs.writeFileSync(imgpath, img.data)
        this.images.unshift(imgurl)
        this.images = this.images.slice(0, 20)

        this.wss.notifyAll([this.user.id], this.name, {
          event: data.event,
          data: { img: imgurl },
        })
      },
      'save': (ws: Socket, { settings }: { settings: DrawcastSettings }) => {
        this.data.settings = settings
        this.storage.save(this.name, this.data)
        this.data = this.reinit()
        this.updateClients('init')
      },
    }
  }

  getCommands() {
    return []
  }

  async onChatMsg(chatMessageContext: ChatMessageContext) {
  }

  async onRewardRedemption(RewardRedemptionContext: RewardRedemptionContext) {
  }
}

export default DrawcastModule
