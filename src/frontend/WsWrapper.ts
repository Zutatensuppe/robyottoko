import { logger } from "../common/fn"

const CODE_GOING_AWAY = 1001
const CODE_CUSTOM_DISCONNECT = 4000

const log = logger('WsWrapper.ts')

/**
 * Wrapper around ws that
 * - buffers 'send' until a connection is available
 * - automatically tries to reconnect on close
 */
export default class WsWrapper {
  // actual ws handle
  handle: WebSocket | null = null

  // timeout for automatic reconnect
  reconnectTimeout: NodeJS.Timeout | null = null

  // buffer for 'send'
  sendBuffer: string[] = []

  addr: string

  protocols: string

  public onopen: (e: Event) => void = () => {
    // pass
  }
  public onclose: (e: CloseEvent | unknown) => void = () => {
    // pass
  }
  public onmessage: (e: MessageEvent<any>) => void = () => {
    // pass
  }

  constructor(addr: string, protocols: string) {
    this.addr = addr
    this.protocols = protocols
  }

  send(txt: string) {
    if (this.handle) {
      this.handle.send(txt)
    } else {
      this.sendBuffer.push(txt)
    }
  }

  connect() {
    try {
      const ws = new WebSocket(this.addr, this.protocols)
      ws.onopen = (e) => {
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
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
      }
      ws.onmessage = (e) => {
        this.onmessage(e)
      }
      ws.onclose = (e) => {
        this.handle = null
        if (e.code === CODE_CUSTOM_DISCONNECT) {
          log.info('custom disconnect, will not reconnect')
        } else if (e.code === CODE_GOING_AWAY) {
          log.info('going away, will not reconnect')
        } else {
          this.reconnectTimeout = setTimeout(() => { this.connect() }, 1000)
        }
        this.onclose(e)
      }
    } catch (e) {
      // something went wrong....
      log.error(e)
      this.handle = null
      this.reconnectTimeout = setTimeout(() => { this.connect() }, 1000)
      this.onclose(e)
    }
  }

  disconnect() {
    if (this.handle) {
      this.handle.close(CODE_CUSTOM_DISCONNECT)
    }
  }
}
