import fn from '../../fn'
import { nonce, logger } from '../../common/fn'
import fs from 'fs'
import { Socket } from '../../net/WebSocketServer'
import { Bot, ChatMessageContext, DrawcastSettings, Module, MODULE_NAME, WIDGET_TYPE } from '../../types'
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
  public name = MODULE_NAME.DRAWCAST

  // @ts-ignore
  public bot: Bot
  // @ts-ignore
  public user: User
  // @ts-ignore
  private data: DrawcastModuleData

  constructor(
    bot: Bot,
    user: User,
  ) {
    // @ts-ignore
    return (async () => {
      this.bot = bot
      this.user = user
      this.data = await this.reinit()
      return this;
    })();
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

  async reinit(): Promise<DrawcastModuleData> {
    const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {})
    if (!data.images) {
      data.images = this._loadAllImages()
    }
    return {
      settings: default_settings(data.settings),
      images: default_images(data.images),
    }
  }

  async save(): Promise<void> {
    await this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
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

  async drawUrl(): Promise<string> {
    return await this.bot.getWidgets().getPublicWidgetUrl(WIDGET_TYPE.DRAWCAST_DRAW, this.user.id)
  }

  async receiveUrl(): Promise<string> {
    return await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.DRAWCAST_RECEIVE, this.user.id)
  }

  async controlUrl(): Promise<string> {
    return await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.DRAWCAST_CONTROL, this.user.id)
  }

  async wsdata(eventName: string): Promise<DrawcastModuleWsData> {
    return {
      event: eventName,
      data: {
        settings: this.data.settings,
        images: this.data.images, // lots of images! maybe limit to 20 images
        drawUrl: await this.drawUrl(),
        controlWidgetUrl: await this.controlUrl(),
        receiveWidgetUrl: await this.receiveUrl(),
      },
    };
  }

  getWsEvents() {
    return {
      'conn': async (ws: Socket) => {
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, {
          event: 'init',
          data: {
            settings: this.data.settings,
            images: this.data.images.filter(image => image.approved).slice(0, 20),
            drawUrl: await this.drawUrl(),
            controlWidgetUrl: await this.controlUrl(),
            receiveWidgetUrl: await this.receiveUrl(),
          }
        }, ws)
      },
      'approve_image': async (_ws: Socket, { path }: { path: string }) => {
        const image = this.data.images.find(item => item.path === path)
        if (!image) {
          // should not happen
          log.error({ path }, 'approve_image: image not found')
          return
        }
        image.approved = true
        this.data.images = this.data.images.filter(item => item.path !== image.path)
        this.data.images.unshift(image)
        await this.save()
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'approved_image_received',
          data: { nonce: '', img: image.path, mayNotify: false },
        })
      },
      'deny_image': async (_ws: Socket, { path }: { path: string }) => {
        const image = this.data.images.find(item => item.path === path)
        if (!image) {
          // should not happen
          log.error({ path }, 'deny_image: image not found')
          return
        }
        this.data.images = this.data.images.filter(item => item.path !== image.path)
        await this.save()
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'denied_image_received',
          data: { nonce: '', img: image.path, mayNotify: false },
        })
      },
      'post': async (_ws: Socket, data: PostEventData) => {
        const rel = `/uploads/drawcast/${this.user.id}`
        const img = fn.decodeBase64Image(data.data.img)
        const name = fn.safeFileName(`${(new Date()).toJSON()}-${nonce(6)}.${fn.mimeToExt(img.type)}`)

        const dirPath = `./data${rel}`
        const filePath = `${dirPath}/${name}`
        const urlPath = `${rel}/${name}`

        fs.mkdirSync(dirPath, { recursive: true })
        fs.writeFileSync(filePath, img.data)

        const approved = this.data.settings.requireManualApproval ? false : true

        this.data.images.unshift({ path: urlPath, approved })
        await this.save()

        const event = approved ? 'approved_image_received' : 'image_received'
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: event,
          data: { nonce: data.data.nonce, img: urlPath, mayNotify: true },
        })
      },
      'save': async (_ws: Socket, { settings }: { settings: DrawcastSettings }) => {
        this.data.settings = settings
        await this.save()
        this.data = await this.reinit()
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'init',
          data: {
            settings: this.data.settings,
            images: this.data.images.filter(image => image.approved).slice(0, 20),
            drawUrl: await this.drawUrl(),
            controlWidgetUrl: await this.controlUrl(),
            receiveWidgetUrl: await this.receiveUrl(),
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
}

export default DrawcastModule
