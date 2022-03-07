import fn from '../../fn'
import { nonce, logger } from '../../common/fn'
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
    nonce: string
    img: string
  }
}

class DrawcastModule implements Module {
  public name = 'drawcast'

  public bot: Bot
  public user: User

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
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {})
    return {
      settings: default_settings(data.settings),
    }
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
        const name = `${(new Date()).toJSON()}-${nonce(6)}.${fn.mimeToExt(img.type)}`
        const path = `./data${rel}`
        const imgpath = `${path}/${name}`
        const imgurl = `${rel}/${name}`
        fs.mkdirSync(path, { recursive: true })
        fs.writeFileSync(imgpath, img.data)
        this.images.unshift(imgurl)
        this.images = this.images.slice(0, 20)

        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: data.event,
          data: { nonce: data.data.nonce, img: imgurl },
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
