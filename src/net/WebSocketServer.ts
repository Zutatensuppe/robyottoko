import WebSocket from 'ws'
import { IncomingMessage } from 'http'
import { SECOND } from '../fn'
import { logger } from '../common/fn'
import ModuleManager from '../mod/ModuleManager'
import { WsConfig } from '../types'
import Auth from './Auth'

const log = logger("WebSocketServer.ts")

type WebSocketNotifyData = any

export interface Socket extends WebSocket.WebSocket {
  user_id?: number
  isAlive?: boolean
  module?: string
}

class WebSocketServer {
  private moduleManager: ModuleManager
  private config: WsConfig
  private auth: Auth

  private _websocketserver: WebSocket.Server | null
  private _interval: NodeJS.Timer | null

  constructor(
    moduleManager: ModuleManager,
    config: WsConfig,
    auth: Auth,
  ) {
    this.moduleManager = moduleManager
    this.config = config
    this.auth = auth
    this._websocketserver = null
    this._interval = null
  }

  connectstring() {
    return this.config.connectstring
  }

  listen() {
    this._websocketserver = new WebSocket.Server(this.config)
    this._websocketserver.on('connection', (socket: Socket, request: IncomingMessage) => {
      const token = socket.protocol
      const tokenInfo = this.auth.wsTokenFromProtocol(token)
      if (!tokenInfo) {
        log.info('not found token: ', token)
        socket.close()
        return
      }

      socket.user_id = tokenInfo.user_id

      const pathname = new URL(this.connectstring()).pathname
      if (request.url?.indexOf(pathname) !== 0) {
        log.info('bad request url: ', request.url)
        socket.close()
        return
      }

      socket.isAlive = true
      socket.on('pong', function () {
        socket.isAlive = true;
      })

      const relpath = request.url.substr(pathname.length)
      if (relpath === '/core') {
        socket.module = 'core'
        // log.info('/conn connected')
        // not a module
        // ... doesnt matter
        return
      }

      // module routing
      for (const module of this.moduleManager.all(socket.user_id)) {
        if ('/' + module.name !== relpath) {
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

    this._interval = setInterval(() => {
      if (this._websocketserver === null) {
        return
      }
      this._websocketserver.clients.forEach((socket: Socket) => {
        if (socket.isAlive === false) {
          return socket.terminate()
        }
        socket.isAlive = false
        socket.ping(() => {
          // pass
        })
      })
    }, 30 * SECOND)

    this._websocketserver.on('close', () => {
      if (this._interval === null) {
        return
      }
      clearInterval(this._interval)
    })
  }

  notifyOne(user_ids: number[], moduleName: string, data: WebSocketNotifyData, socket: Socket) {
    if (
      socket.isAlive
      && socket.user_id
      && user_ids.includes(socket.user_id)
      && socket.module === moduleName
    ) {
      log.info(`notifying ${socket.user_id} ${moduleName} (${data.event})`)
      socket.send(JSON.stringify(data))
    }
  }

  sockets(user_ids: number[], moduleName: string | null = null): Socket[] {
    if (!this._websocketserver) {
      log.error(`sockets(): _websocketserver is null`)
      return []
    }

    const sockets: Socket[] = []
    this._websocketserver.clients.forEach((socket: Socket) => {
      if (!socket.isAlive) {
        // dont add non alive sockets
        return
      }
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
