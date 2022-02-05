import fn from '../../fn'
import { logger } from '../../common/fn'
import fs from 'fs'
import WebServer from '../../WebServer'
import WebSocketServer, { Socket } from '../../net/WebSocketServer'
import Tokens from '../../services/Tokens'
import Variables from '../../services/Variables'
import { Bot, ChatMessageContext, DrawcastSettings, Module, RewardRedemptionContext } from '../../types'
import ModuleStorage from '../ModuleStorage'
import { User } from '../../services/Users'
import TwitchClientManager from '../../net/TwitchClientManager'
import { default_settings } from './DrawcastModuleCommon'
import { NextFunction, Response } from 'express'

const log = logger('DrawcastModule.ts')

interface PostEventData {
  event: 'post'
  data: {
    img: string
  }
}

class DrawcastModule implements Module {
  public name = 'drawcast'
  public variables: Variables

  private user: User
  private wss: WebSocketServer
  private storage: ModuleStorage
  private ws: WebServer
  private tokens: Tokens

  private defaultSettings: DrawcastSettings = default_settings()
  private data: { settings: DrawcastSettings }
  private images: string[]

  constructor(
    bot: Bot,
    user: User,
    _clientManager: TwitchClientManager,
  ) {
    this.variables = bot.getUserVariables(user)
    this.user = user
    this.wss = bot.getWebSocketServer()
    this.storage = bot.getUserModuleStorage(user)

    this.ws = bot.getWebServer()
    this.tokens = bot.getTokens()
    this.data = this.reinit()

    this.images = this.loadAllImages().slice(0, 20)
  }

  async userChanged(user: User) {
    this.user = user
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
    if (data.settings.customProfileImage && !data.settings.customProfileImage.urlpath && data.settings.customProfileImage.file) {
      data.settings.customProfileImage.urlpath = `/uploads/${encodeURIComponent(data.settings.customProfileImage.file)}`
    }
    if (!data.settings.notificationSound) {
      data.settings.notificationSound = this.defaultSettings.notificationSound
    }
    if (data.settings.notificationSound && !data.settings.notificationSound.urlpath && data.settings.notificationSound.file) {
      data.settings.notificationSound.urlpath = `/uploads/${encodeURIComponent(data.settings.notificationSound.file)}`
    }
    if (!data.settings.displayLatestForever) {
      data.settings.displayLatestForever = this.defaultSettings.displayLatestForever
    }
    if (!data.settings.displayLatestAutomatically) {
      data.settings.displayLatestAutomatically = this.defaultSettings.displayLatestAutomatically
    }
    if (typeof data.settings.recentImagesTitle === 'undefined') {
      data.settings.recentImagesTitle = this.defaultSettings.recentImagesTitle
    }
    if (typeof data.settings.favoriteLists === 'undefined') {
      data.settings.favoriteLists = [
        {
          list: data.settings.favorites || [],
          title: data.settings.favoriteImagesTitle || '',
        },
      ]
    }
    return {
      settings: data.settings
    }
  }

  widgets() {
    return {}
  }

  getRoutes() {
    return {
      get: {
        '/api/drawcast/all-images/': async (_req: any, res: Response, _next: NextFunction) => {
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

  async onChatMsg(_chatMessageContext: ChatMessageContext) {
    // pass
  }

  async onRewardRedemption(_RewardRedemptionContext: RewardRedemptionContext) {
    // pass
  }
}

export default DrawcastModule
