import fn from '../../fn'
import { nonce, logger } from '../../common/fn'
import fs from 'fs'
import { Socket } from '../../net/WebSocketServer'
import { Bot, ChatMessageContext, DrawcastSettings, Module, RewardRedemptionContext } from '../../types'
import { User } from '../../services/Users'
import { default_settings, default_images, DrawcastModuleData, DrawcastImage, DrawcastModuleWsData } from './DrawcastModuleCommon'
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

  private data: DrawcastModuleData

  constructor(
    bot: Bot,
    user: User,
  ) {
    this.bot = bot
    this.user = user

    this.data = this.reinit()
  }

  async userChanged(user: User) {
    this.user = user
  }

  _loadAllImages(): DrawcastImage[] {
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
        .map((v) => ({
          path: `${rel}/${v.name}`,
          approved: true,
        }))
    } catch (e) {
      return []
    }
  }

  saveCommands() {
    // pass
  }

  reinit(): DrawcastModuleData {
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {})
    if (!data.images) {
      data.images = this._loadAllImages()
    }
    return {
      settings: default_settings(data.settings),
      images: default_images(data.images),
    }
  }

  save(): void {
    this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
  }

  getRoutes() {
    return {
      get: {
        '/api/drawcast/all-images/': async (_req: any, res: Response, _next: NextFunction) => {
          res.send(this.data.images)
        },
      },
    }
  }

  drawUrl() {
    const pubToken = this.bot.getTokens().getPubTokenForUserId(this.user.id).token
    return this.bot.getWebServer().pubUrl(this.bot.getWebServer().widgetUrl('drawcast_draw', pubToken))
  }

  wsdata(eventName: string): DrawcastModuleWsData {
    return {
      event: eventName,
      data: {
        settings: this.data.settings,
        images: this.data.images, // lots of images! maybe limit to 20 images
        drawUrl: this.drawUrl(),
      },
    };
  }

  getWsEvents() {
    return {
      'conn': (ws: Socket) => {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, {
          event: 'init',
          data: {
            settings: this.data.settings,
            images: this.data.images.filter(image => image.approved).slice(0, 20),
            drawUrl: this.drawUrl(),
          }
        }, ws)
      },
      'approve_image': (ws: Socket, { path }: { path: string }) => {
        const image = this.data.images.find(item => item.path === path)
        if (!image) {
          // should not happen
          log.error(`approve_image: image not found: ${path}`)
          return
        }
        image.approved = true
        this.data.images = this.data.images.filter(item => item.path !== image.path)
        this.data.images.unshift(image)
        this.save()
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'approved_image_received',
          data: { nonce: '', img: image.path, mayNotify: false },
        })
      },
      'deny_image': (ws: Socket, { path }: { path: string }) => {
        const image = this.data.images.find(item => item.path === path)
        if (!image) {
          // should not happen
          log.error(`deny_image: image not found: ${path}`)
          return
        }
        this.data.images = this.data.images.filter(item => item.path !== image.path)
        this.save()
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'denied_image_received',
          data: { nonce: '', img: image.path, mayNotify: false },
        })
      },
      'post': (ws: Socket, data: PostEventData) => {
        const rel = `/uploads/drawcast/${this.user.id}`
        const img = fn.decodeBase64Image(data.data.img)
        const name = `${(new Date()).toJSON()}-${nonce(6)}.${fn.mimeToExt(img.type)}`

        const dirPath = `./data${rel}`
        const filePath = `${dirPath}/${name}`
        const urlPath = `${rel}/${name}`

        fs.mkdirSync(dirPath, { recursive: true })
        fs.writeFileSync(filePath, img.data)

        const approved = this.data.settings.requireManualApproval ? false : true

        this.data.images.unshift({ path: urlPath, approved })
        this.save()

        const event = approved ? 'approved_image_received' : 'image_received'
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: event,
          data: { nonce: data.data.nonce, img: urlPath, mayNotify: true },
        })
      },
      'save': (ws: Socket, { settings }: { settings: DrawcastSettings }) => {
        this.data.settings = settings
        this.save()
        this.data = this.reinit()
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'init',
          data: {
            settings: this.data.settings,
            images: this.data.images.filter(image => image.approved).slice(0, 20),
            drawUrl: this.drawUrl(),
          }
        })
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
