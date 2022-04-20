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
    const reconnect = () => {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }
      this.reconnectTimeout = setTimeout(() => { this.connect() }, 1000)
    }

    try {
      log.info(`trying to connect: ${this.addr}`)
      let timedOut = false
      const ws = new WebSocket(this.addr, this.protocols)
      setTimeout(() => {
        if (!this.handle) {
          // connection was not opened
          timedOut = true
          log.info(`connect attempt timed out`)
          // this aborts the current connection attempt
          ws.close(CODE_CUSTOM_DISCONNECT)

          reconnect()
        } else {
          // connection was made
        }
      }, 5000)

      ws.onopen = (e) => {
        if (timedOut) {
          // this should not be required, but
          // just in case we do a custom disconnect here
          // so that no reconnect is attempted
          ws.close(CODE_CUSTOM_DISCONNECT)
          return
        }

        // prevent two handles being active
        this.disconnect()

        log.info('ws connected')
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
        this.onclose(e)
        if (e.code === CODE_CUSTOM_DISCONNECT) {
          log.info('custom disconnect, will not reconnect')
        } else if (e.code === CODE_GOING_AWAY) {
          log.info('going away, will not reconnect')
        } else {
          log.info(`connection closed, trying to reconnect. code: ${e.code}`)
          reconnect()
        }
      }
    } catch (e) {
      // something went wrong....
      log.error(e)
      this.handle = null
      this.onclose(e)
      reconnect()
    }
  }

  disconnect() {
    if (this.handle) {
      log.info(`handle existed, closing with code: ${CODE_CUSTOM_DISCONNECT}`)
      this.handle.close(CODE_CUSTOM_DISCONNECT)
    }
  }
}
