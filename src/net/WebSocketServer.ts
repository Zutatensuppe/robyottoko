import * as WebSocket from 'ws'
import type { IncomingMessage } from 'http'
import { logger } from '../common/fn'
import type { Bot} from '../types'
import { tryParseModuleName } from '../enums'
import { uniqId } from '../fn'

const log = logger('WebSocketServer.ts')
const CODE_WS_AUTH_FAILED = 4001

type WebSocketNotifyData = any

export interface Socket extends WebSocket.WebSocket {
  user_id?: number | null
  module?: string | null
  id?: string | null
}

const determineUserIdAndModuleName = async (
  wsBasePath: string,
  wsRequestUrl: string,
  socket: Socket,
  bot: Bot,
): Promise<{ userId: number | null, moduleName: string | null}> => {
  if (wsRequestUrl.indexOf(wsBasePath) !== 0) {
    return { userId: null, moduleName: null }
  }

  const path = wsRequestUrl.substring(wsBasePath.length) || ''
  const relpath = path.startsWith('/') ? path.substring(1) : path
  const widgetModule = bot.getWidgets().getModuleTypeByWsPath(path)
  const moduleName = tryParseModuleName(widgetModule || relpath)

  const token = socket.protocol
  const tokenType = widgetModule ? relpath : null
  const tokenInfo = await bot.getAuth().wsTokenFromProtocol(token, tokenType)
  const userId = tokenInfo ? tokenInfo.user_id : null

  return { userId, moduleName }
}

class WebSocketServer {
  private _websocketserver: WebSocket.WebSocketServer | null = null

  listen(bot: Bot) {
    this._websocketserver = new WebSocket.WebSocketServer(bot.getConfig().ws)
    this._websocketserver.on('connection', async (socket: Socket, request: IncomingMessage) => {
      // note: here the socket is already set in _websocketserver.clients !
      // but it has no user_id or module set yet!

      const wsBasePath = new URL(bot.getConfig().ws.connectstring).pathname
      const wsRequestUrl = request.url || ''

      // userId is the id of the OWNER of the widget
      // it is NOT the id of the user actually visiting that page right now
      const { userId, moduleName } = await determineUserIdAndModuleName(wsBasePath, wsRequestUrl, socket, bot)

      socket.user_id = userId
      socket.module = moduleName
      socket.id = uniqId()

      log.info({
        moduleName,
        socket: { protocol: socket.protocol },
      }, 'added socket')

      log.info({
        count: this.sockets().filter(s => s.module === socket.module).length,
      }, 'socket_count')

      socket.on('close', () => {
        log.info({
          moduleName,
          socket: { protocol: socket.protocol },
        }, 'removed socket')

        log.info({
          count: this.sockets().filter(s => s.module === socket.module).length,
        }, 'socket count')
      })

      if (!socket.user_id) {
        log.info({
          wsRequestUrl,
          socket: { protocol: socket.protocol },
        }, 'not found token')
        socket.close(CODE_WS_AUTH_FAILED, 'invalid ws token')
        return
      }

      if (!socket.module) {
        log.info({ wsRequestUrl }, 'bad request url')
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

      socket.on('message', (message: WebSocket.Data) => {
        const dataStr = String(message)
        if (dataStr === 'PING') {
          socket.send('PONG')
          return
        }

        try {
          const unknownData = message as unknown
          const d = JSON.parse(unknownData as string)
          if (m && d.event) {
            const evts = m.getWsEvents()
            if (evts && evts[d.event]) {
              evts[d.event](socket, d)
            }
          }
        } catch (e) {
          log.error({ e }, 'socket on message')
        }
      })

      socket.send('SERVER_INIT')
    })
  }

  isUserConnected(user_id: number): boolean {
    return !!this.sockets().find(s => s.user_id === user_id)
  }

  _notify(socket: Socket, data: WebSocketNotifyData): void {
    log.info({ user_id: socket.user_id, module: socket.module, event: data.event }, 'notifying')
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
      log.error({
        socket: {
          user_id: socket.user_id,
          module: socket.module,
        },
        user_ids,
        moduleName,
        isConnectedSocket,
      }, 'tried to notify invalid socket')
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
