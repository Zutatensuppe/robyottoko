import WebSocket from 'ws'
import { IncomingMessage } from 'http'
import { logger, withoutLeading } from '../common/fn'
import { Bot, MODULE_NAME } from '../types'
import { moduleByWidgetType } from '../services/Widgets'

const log = logger("WebSocketServer.ts")

type WebSocketNotifyData = any

export interface Socket extends WebSocket.WebSocket {
  user_id?: number | null
  module?: string | null
}

const determineUserIdAndModuleName = async (
  basePath: string,
  requestUrl: string,
  socket: Socket,
  bot: Bot,
): Promise<{ userId: number | null, moduleName: string | null}> => {
  const relativePath = requestUrl.substring(basePath.length) || ''
  const relpath = withoutLeading(relativePath, '/')

  if (requestUrl.indexOf(basePath) !== 0) {
    return { userId: null, moduleName: null }
  }

  const widgetPrefix = 'widget_'
  const widgetModule = moduleByWidgetType(relpath.startsWith(widgetPrefix) ? relpath.substring(widgetPrefix.length) : '')
  const tokenType = widgetModule ? relpath : null
  const tmpModuleName = widgetModule || relpath
  const moduleName = Object.values(MODULE_NAME).includes(tmpModuleName as any) ? tmpModuleName : null
  const token = socket.protocol

  const tokenInfo = await bot.getAuth().wsTokenFromProtocol(token, tokenType)
  const userId = tokenInfo ? tokenInfo.user_id : null

  return { userId, moduleName }
}

class WebSocketServer {
  private _websocketserver: WebSocket.Server | null

  constructor() {
    this._websocketserver = null
  }

  listen(bot: Bot) {
    this._websocketserver = new WebSocket.Server(bot.getConfig().ws)
    this._websocketserver.on('connection', async (socket: Socket, request: IncomingMessage) => {
      // note: here the socket is already set in _websocketserver.clients !
      // but it has no user_id or module set yet!

      const basePath = new URL(bot.getConfig().ws.connectstring).pathname
      const requestUrl = request.url || ''
      const { userId, moduleName } = await determineUserIdAndModuleName(basePath, requestUrl, socket, bot)

      socket.user_id = userId
      socket.module = moduleName

      log.info('added socket: ', moduleName, socket.protocol)
      log.info('socket count: ', this.sockets().filter(s => s.module === socket.module).length)

      socket.on('close', () => {
        log.info('removed socket: ', moduleName, socket.protocol)
        log.info('socket count: ', this.sockets().filter(s => s.module === socket.module).length)
      })

      if (!socket.user_id) {
        log.info('not found token: ', socket.protocol, requestUrl)
        socket.close()
        return
      }

      if (!socket.module) {
        log.info('bad request url: ', requestUrl)
        socket.close()
        return
      }

      // user connected
      bot.getEventHub().emit('wss_user_connected', socket)

      const m = bot.getModuleManager().get(socket.user_id, socket.module)
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
