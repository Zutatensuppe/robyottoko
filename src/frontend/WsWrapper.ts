import { logger, nonce } from '../common/fn'

const CODE_GOING_AWAY = 1001
const CODE_CUSTOM_DISCONNECT = 4000

const log = logger('WsWrapper.ts')

/**
 * Wrapper around ws that
 * - buffers 'send' until a connection is available
 * - automatically tries to reconnect on close
 */
export default class WsWrapper {
  id: string | null = null

  // actual ws handle
  handle: WebSocket | null = null

  // timeout for automatic reconnect
  reconnectTimeout: NodeJS.Timeout | null = null

  // buffer for 'send'
  sendBuffer: string[] = []

  timerId: any = 0
  gotPong: boolean = false
  pongWaitTimerId: any = 0

  constructor(private readonly addr: string, private readonly protocols: string) {
  }

  public onopen: (e: Event) => void = () => {
    // pass
  }
  public onclose: (e: CloseEvent | unknown) => void = () => {
    // pass
  }
  public onmessage: (e: MessageEvent<any>) => void = () => {
    // pass
  }

  keepAlive(timeout = 20000) {
    if (this.handle && this.handle.readyState == this.handle.OPEN) {
      this.gotPong = false
      this.handle.send(JSON.stringify({ type: 'ping' }))
      if (this.pongWaitTimerId) {
        clearTimeout(this.pongWaitTimerId)
      }
      this.pongWaitTimerId = setTimeout(() => {
        if (!this.gotPong && this.handle) {
          // close without custom disconnect, to trigger reconnect
          this.handle.close()
        }
      }, 1000) // server should answer more quickly in reality
    }
    this.timerId = setTimeout(() => {
      this.keepAlive(timeout)
    }, timeout)
  }

  cancelKeepAlive() {
    if (this.timerId) {
      clearTimeout(this.timerId)
    }
  }

  send(txt: string) {
    if (this.handle) {
      this.handle.send(txt)
    } else {
      this.sendBuffer.push(txt)
    }
  }

  connect() {
    const id = nonce(10)
    this.id = id
    const reconnect = () => {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }
      this.reconnectTimeout = setTimeout(() => { this.connect() }, 1000)
    }

    log.info({ id, addr: this.addr }, 'trying to connect')
    const ws = new WebSocket(this.addr, this.protocols)
    ws.onopen = (e) => {
      log.info({ id }, 'ws connected')
      if (id !== this.id) {
        // this is not the last connection.. ignore it
        log.info({
          id,
          this_id: this.id
        }, 'connected but it is not the last attempt')
        ws.close(CODE_CUSTOM_DISCONNECT)
        return
      }

      if (this.handle) {
        // should not happen...
        log.error({ e }, 'handle already existed, closing old one and replacing it')
        this.handle.close(CODE_CUSTOM_DISCONNECT)
      }
      this.handle = ws
      // should have a queue worker
      while (this.sendBuffer.length > 0) {
        const text = this.sendBuffer.shift()
        if (text) {
          this.handle.send(text)
        }
      }
      this.onopen(e)
      this.keepAlive()
    }
    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data)
        if (parsed.type && parsed.type === 'pong') {
          this.gotPong = true
          return
        }
      } catch (e) {
        // ignore
      }
      this.onmessage(e)
    }
    ws.onerror = (e) => {
      this.cancelKeepAlive()
      log.error({ e, id })
      // this will cause a close with reason 1006
      // reconnect will automatically happen
    }
    ws.onclose = (e) => {
      this.cancelKeepAlive()
      this.handle = null
      this.onclose(e)
      if (e.code === CODE_CUSTOM_DISCONNECT) {
        log.info({ id }, 'custom disconnect, will not reconnect')
      } else if (e.code === CODE_GOING_AWAY) {
        log.info({ id }, 'going away, will not reconnect')
      } else {
        log.info({ id, code: e.code }, 'connection closed, trying to reconnect.')
        reconnect()
      }
    }
  }

  disconnect() {
    if (this.handle) {
      log.info({ code: CODE_CUSTOM_DISCONNECT }, 'handle existed, closing')
      this.handle.close(CODE_CUSTOM_DISCONNECT)
    }
  }
}
