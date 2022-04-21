import WebSocket from 'ws'
import { IncomingMessage } from 'http'
import { logger, SECOND } from '../common/fn'
import ModuleManager from '../mod/ModuleManager'
import { WsConfig } from '../types'
import Auth from './Auth'

const log = logger("WebSocketServer.ts")

type WebSocketNotifyData = any

export interface Socket extends WebSocket.WebSocket {
  user_id?: number
  module?: string
}

class WebSocketServer {
  private moduleManager: ModuleManager
  private config: WsConfig
  private auth: Auth

  private _websocketserver: WebSocket.Server | null

  constructor(
    moduleManager: ModuleManager,
    config: WsConfig,
    auth: Auth,
  ) {
    this.moduleManager = moduleManager
    this.config = config
    this.auth = auth
    this._websocketserver = null
  }

  connectstring() {
    return this.config.connectstring
  }

  listen() {
    this._websocketserver = new WebSocket.Server(this.config)
    this._websocketserver.on('connection', async (socket: Socket, request: IncomingMessage) => {
      const pathname = new URL(this.connectstring()).pathname
      if (request.url?.indexOf(pathname) !== 0) {
        log.info('bad request url: ', request.url)
        socket.close()
        return
      }

      const token = socket.protocol
      const relpathfull = request.url.substr(pathname.length)
      const widget_path_to_module_map: Record<string, string> = {
        widget_avatar: 'avatar',
        widget_avatar_receive: 'avatar',
        widget_drawcast_control: 'drawcast',
        widget_drawcast_draw: 'drawcast',
        widget_drawcast_receive: 'drawcast',
        widget_media: 'general',
        widget_pomo: 'pomo',
        'widget_speech-to-text': 'speech-to-text',
        'widget_speech-to-text_receive': 'speech-to-text',
        widget_sr: 'sr',
      }
      const relpath = relpathfull.startsWith('/') ? relpathfull.substring(1) : relpathfull
      const widgetModule = widget_path_to_module_map[relpath]
      const token_type = widgetModule ? relpath : null

      const tokenInfo = await this.auth.wsTokenFromProtocol(token, token_type)
      if (!tokenInfo) {
        log.info('not found token: ', token, relpath)
        socket.close()
        return
      }

      socket.user_id = tokenInfo.user_id

      socket.on('message', (data) => {
        try {
          const unknownData = data as unknown
          const d = JSON.parse(unknownData as string)
          if (d.type && d.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }))
          }
        } catch (e) {
          // ignore
        }
      })

      if (relpath === 'core') {
        socket.module = 'core'
        // log.info('/conn connected')
        // not a module
        // ... doesnt matter
        return
      }

      // module routing
      for (const module of this.moduleManager.all(socket.user_id)) {
        if (module.name !== relpath && module.name !== widgetModule) {
          continue
        }
        socket.module = module.name

        const evts = module.getWsEvents()
        if (evts) {
          socket.on('message', (data) => {
            log.info(`ws|${socket.user_id}| `, data)
            const unknownData = data as unknown
            const d = JSON.parse(unknownData as string)
            if (!d.event) {
              return
            }

            if (evts[d.event]) {
              evts[d.event](socket, d)
            }
          })

          if (evts['conn']) {
            evts['conn'](socket)
          }
        }
      }
    })
  }

  notifyOne(user_ids: number[], moduleName: string, data: WebSocketNotifyData, socket: Socket) {
    if (
      socket.user_id
      && user_ids.includes(socket.user_id)
      && socket.module === moduleName
    ) {
      log.info(`notifying ${socket.user_id} ${moduleName} (${data.event})`)
      socket.send(JSON.stringify(data))
    }
  }

  isUserConnected(user_id: number): boolean {
    return this.sockets([user_id]).length > 0
  }

  sockets(user_ids: number[], moduleName: string | null = null): Socket[] {
    if (!this._websocketserver) {
      log.error(`sockets(): _websocketserver is null`)
      return []
    }

    const sockets: Socket[] = []
    this._websocketserver.clients.forEach((socket: Socket) => {
      if (!socket.user_id || !user_ids.includes(socket.user_id)) {
        // dont add sockets not belonging to user
        return
      }
      if (moduleName !== null && socket.module !== moduleName) {
        // dont add sockets not belonging to module
        return
      }
      sockets.push(socket)
    })
    return sockets
  }

  notifyAll(user_ids: number[], moduleName: string, data: WebSocketNotifyData) {
    if (!this._websocketserver) {
      log.error(`tried to notifyAll, but _websocketserver is null`)
      return
    }
    this._websocketserver.clients.forEach((socket) => {
      this.notifyOne(user_ids, moduleName, data, socket)
    })
  }

  close() {
    if (this._websocketserver) {
      this._websocketserver.close()
    }
  }
}

export default WebSocketServer
