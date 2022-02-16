import fn from '../../fn'
import { logger } from '../../common/fn'
import fs from 'fs'
import { Socket } from '../../net/WebSocketServer'
import { Bot, ChatMessageContext, DrawcastSettings, Module, RewardRedemptionContext } from '../../types'
import { User } from '../../services/Users'
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

  public bot: Bot
  public user: User

  private defaultSettings: DrawcastSettings = default_settings()
  private data: { settings: DrawcastSettings }
  private images: string[]

  constructor(
    bot: Bot,
    user: User,
  ) {
    this.bot = bot
    this.user = user

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
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {
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
    const pubToken = this.bot.getTokens().getPubTokenForUserId(this.user.id).token
    return this.bot.getWebServer().pubUrl(this.bot.getWebServer().widgetUrl('drawcast_draw', pubToken))
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
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName: string) {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, this.wsdata(eventName))
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

        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: data.event,
          data: { img: imgurl },
        })
      },
      'save': (ws: Socket, { settings }: { settings: DrawcastSettings }) => {
        this.data.settings = settings
        this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
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
