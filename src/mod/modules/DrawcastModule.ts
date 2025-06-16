import fn from '../../fn'
import { arrayIncludesIgnoreCase, nonce, logger } from '../../common/fn'
import type { Socket } from '../../net/WebSocketServer'
import type { Bot, ChatMessageContext, DrawcastSettings, Module} from '../../types'
import { MODULE_NAME, WIDGET_TYPE } from '../../types'
import type { User } from '../../repo/Users'
import type { DrawcastModuleData, DrawcastImage, DrawcastModuleWsData } from './DrawcastModuleCommon'
import { default_settings, default_images } from './DrawcastModuleCommon'
import FileSystem from '../../services/FileSystem'

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
  private data: DrawcastModuleData

  constructor(
    public readonly bot: Bot,
    public user: User,
  ) {
    // @ts-ignore
    return (async () => {
      this.data = await this.reinit()
      return this
    })()
  }

  async userChanged(user: User) {
    this.user = user
  }

  private async _deleteImage(image: DrawcastImage): Promise<boolean> {
    const rel = `/uploads/drawcast/${this.user.id}`
    if (!image.path.startsWith(rel)) {
      return false
    }
    const name = image.path.substring(rel.length).replace('/', '').replace('\\', '')
    const path = `./data${rel}`

    if (await FileSystem.fileExists(`${path}/${name}`)) {
      await FileSystem.rm(`${path}/${name}`)
      return true
    }
    return false
  }

  private async _loadAllImages(): Promise<DrawcastImage[]> {
    try {
      // todo: probably better to store latest x images in db
      const rel = `/uploads/drawcast/${this.user.id}`
      const path = `./data${rel}`
      const dir = await FileSystem.readDir(path)
      if (!dir) {
        return []
      }
      const results = []
      for (const name of dir) {
        const stat = await FileSystem.stat(`${path}/${name}`)
        const time = stat.mtime.getTime()
        results.push({ name, time })
      }
      return results
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
    const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {})
    if (!data.images) {
      data.images = await this._loadAllImages()
    }
    return {
      settings: default_settings(data.settings),
      images: default_images(data.images),
      enabled,
    }
  }

  async save(): Promise<void> {
    await this.bot.getRepos().module.save(this.user.id, this.name, this.data)
  }

  getRoutes() {
    return {}
  }

  getImages() {
    return this.data.images
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
        enabled: this.data.enabled,
        settings: this.data.settings,
        images: this.data.images, // lots of images! maybe limit to 20 images
        drawUrl: await this.drawUrl(),
        controlWidgetUrl: await this.controlUrl(),
        receiveWidgetUrl: await this.receiveUrl(),
      },
    }
  }

  isEnabled(): boolean {
    return this.data.enabled
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.data.enabled = enabled
  }

  async checkAuthorized(token: string, onlyOwner: boolean = false): Promise<boolean> {
    const user = await this.bot.getAuth().getBaseUserData(token)
    if (!user) {
      return false
    }
    if (user.user.id === this.user.id) {
      return true
    }
    if (onlyOwner) {
      return false
    }
    return arrayIncludesIgnoreCase(
      this.data.settings.moderationAdmins,
      user.user.name,
    )
  }

  getWsEvents() {
    return {
      conn: async (ws: Socket) => {
        const settings = JSON.parse(JSON.stringify(this.data.settings))
        if (!settings.moderationAdmins.includes(this.user.name)) {
          settings.moderationAdmins.push(this.user.name)
        }
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, {
          event: 'init',
          data: {
            settings,
            images: this.data.images.filter(image => image.approved).slice(0, 20),
            drawUrl: await this.drawUrl(),
            controlWidgetUrl: await this.controlUrl(),
            receiveWidgetUrl: await this.receiveUrl(),
          },
        }, ws)
      },
      get_all_images: async (ws: Socket, { token }: { token: string }) => {
        if (!this.checkAuthorized(token)) {
          log.error({ token }, 'get_all_images: unauthed user')
          return
        }

        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, {
          event: 'all_images',
          data: { images: this.getImages() },
        }, ws)
      },
      approve_image: async (_ws: Socket, { path, token }: { path: string, token: string }) => {
        if (!this.checkAuthorized(token)) {
          log.error({ path, token }, 'approve_image: unauthed user')
          return
        }

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
      deny_image: async (_ws: Socket, { path, token }: { path: string, token: string }) => {
        if (!this.checkAuthorized(token)) {
          log.error({ path, token }, 'deny_image: unauthed user')
          return
        }

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
      delete_image: async (_ws: Socket, { path, token }: { path: string, token: string }) => {
        if (!this.checkAuthorized(token)) {
          log.error({ path, token }, 'delete_image: unauthed user')
          return
        }

        const image = this.data.images.find(item => item.path === path)
        if (!image) {
          // should not happen
          log.error({ path }, 'delete_image: image not found')
          return
        }
        const deleted = await this._deleteImage(image)
        if (!deleted) {
          // should not happen
          log.error({ path }, 'delete_image: image not deleted')
          return
        }
        this.data.settings.favoriteLists = this.data.settings.favoriteLists.map(favoriteList => {
          favoriteList.list = favoriteList.list.filter(img => img !== image.path)
          return favoriteList
        })
        this.data.images = this.data.images.filter(item => item.path !== image.path)
        await this.save()

        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'image_deleted',
          data: { nonce: '', img: image.path, mayNotify: false },
        })
      },
      post: async (_ws: Socket, data: PostEventData) => {
        const rel = `/uploads/drawcast/${this.user.id}`
        const img = fn.decodeBase64Image(data.data.img)
        const name = fn.safeFileName(`${(new Date()).toJSON()}-${nonce(6)}.${fn.mimeToExt(img.type)}`)

        const dirPath = `./data${rel}`
        const filePath = `${dirPath}/${name}`
        const urlPath = `${rel}/${name}`

        await FileSystem.mkDir(dirPath)
        await FileSystem.writeFile(filePath, img.data)

        const approved = this.data.settings.requireManualApproval ? false : true

        this.data.images.unshift({ path: urlPath, approved })
        await this.save()

        const event = approved ? 'approved_image_received' : 'image_received'
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: event,
          data: { nonce: data.data.nonce, img: urlPath, mayNotify: true },
        })
      },
      save: async (_ws: Socket, data: { settings: DrawcastSettings, token: string }) => {
        if (!this.checkAuthorized(data.token, true)) {
          log.error({ token: data.token }, 'save: unauthed user')
          return
        }

        this.data.settings = data.settings
        const settings = JSON.parse(JSON.stringify(this.data.settings))
        if (!settings.moderationAdmins.includes(this.user.name)) {
          settings.moderationAdmins.push(this.user.name)
        }
        await this.save()
        this.data = await this.reinit()
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'init',
          data: {
            settings,
            images: this.data.images.filter(image => image.approved).slice(0, 20),
            drawUrl: await this.drawUrl(),
            controlWidgetUrl: await this.controlUrl(),
            receiveWidgetUrl: await this.receiveUrl(),
          },
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
