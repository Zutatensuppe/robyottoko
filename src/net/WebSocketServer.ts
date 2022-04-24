import WebSocket from 'ws'
import { IncomingMessage } from 'http'
import { logger } from '../common/fn'
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
      // note: here the socket is already set in _websocketserver.clients !
      // but it has no user_id or module set yet!

      const pathname = new URL(this.connectstring()).pathname
      const relpathfull = request.url?.substring(pathname.length) || ''
      const token = socket.protocol
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
      const moduleName = widgetModule || relpath

      const tokenInfo = await this.auth.wsTokenFromProtocol(token, token_type)
      if (tokenInfo) {
        socket.user_id = tokenInfo.user_id
      } else if (process.env.VITE_ENV === 'development') {
        socket.user_id = parseInt(token, 10)
      }

      socket.module = moduleName

      log.log('added socket: ', moduleName, socket.protocol)
      log.log('socket count: ', this.sockets().filter(s => s.module === socket.module).length)

      socket.on('close', () => {
        log.log('removed socket: ', moduleName, socket.protocol)
        log.log('socket count: ', this.sockets().filter(s => s.module === socket.module).length)
      })

      if (request.url?.indexOf(pathname) !== 0) {
        log.info('bad request url: ', request.url)
        socket.close()
        return
      }

      if (!socket.user_id) {
        log.info('not found token: ', token, relpath)
        socket.close()
        return
      }

      const m = this.moduleManager.get(socket.user_id, moduleName)
      // log.info('found a module?', moduleName, !!m)
      if (m) {
        const evts = m.getWsEvents()
        if (evts && evts['conn']) {
          // log.info('connected!', moduleName, !!m)
          evts['conn'](socket)
        }
      }

      socket.on('message', (data) => {
        try {
          const unknownData = data as unknown
          const d = JSON.parse(unknownData as string)
          if (d.type && d.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }))
            return
          }
          if (m && d.event) {
            const evts = m.getWsEvents()
            if (evts && evts[d.event]) {
              evts[d.event](socket, d)
            }
          }
        } catch (e) {
          log.error('socket on message', e)
        }
      })
    })
  }

  isUserConnected(user_id: number): boolean {
    return !!this.sockets().find(s => s.user_id === user_id)
  }

  _notify(socket: Socket, data: WebSocketNotifyData): void {
    log.info(`notifying ${socket.user_id} ${socket.module} (${data.event})`)
    socket.send(JSON.stringify(data))
  }

  notifyOne(
    user_ids: number[],
    moduleName: string,
    data: WebSocketNotifyData,
    socket: Socket,
  ): void {
    const isConnectedSocket = this.sockets().includes(socket)
    if (
      isConnectedSocket
      && socket.user_id
      && user_ids.includes(socket.user_id)
      && socket.module === moduleName
    ) {
      this._notify(socket, data)
    } else {
      log.error(
        'tried to notify invalid socket',
        socket.user_id,
        socket.module,
        user_ids,
        moduleName,
        isConnectedSocket,
      )
    }
  }

  notifyAll(
    user_ids: number[],
    moduleName: string,
    data: WebSocketNotifyData,
  ): void {
    this.sockets().forEach((s: Socket) => {
      if (s.user_id && user_ids.includes(s.user_id) && s.module === moduleName) {
        this._notify(s, data)
      }
    })
  }

  sockets(): Socket[] {
    if (!this._websocketserver) {
      return []
    }
    const sockets: Socket[] = []
    this._websocketserver.clients.forEach((s: Socket) => {
      sockets.push(s)
    })
    return sockets
  }

  close(): void {
    if (this._websocketserver) {
      this._websocketserver.close()
    }
  }
}

export default WebSocketServer
