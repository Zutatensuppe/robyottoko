import { logger, nonce } from "../common/fn"

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

  addr: string

  protocols: string

  timerId: any = 0;

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
      this.handle.send('');
    }
    this.timerId = setTimeout(() => {
      this.keepAlive(timeout)
    }, timeout);
  }

  cancelKeepAlive() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
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
    const id = nonce(10)
    this.id = id
    const reconnect = () => {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }
      this.reconnectTimeout = setTimeout(() => { this.connect() }, 1000)
    }

    log.info(`trying to connect: ${this.addr}`, id)
    const ws = new WebSocket(this.addr, this.protocols)
    ws.onopen = (e) => {
      log.info('ws connected', id)
      if (id !== this.id) {
        // this is not the last connection.. ignore it
        log.info('connected but it is not the last attempt', id, this.id)
        ws.close(CODE_CUSTOM_DISCONNECT)
        return
      }

      if (this.handle) {
        // should not happen...
        log.error(`handle already existed, closing old one and replacing it`, id)
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
      this.onmessage(e)
    }
    ws.onerror = (e) => {
      this.cancelKeepAlive()
      log.error(e, id)
      // this will cause a close with reason 1006
      // reconnect will automatically happen
    }
    ws.onclose = (e) => {
      this.cancelKeepAlive()
      this.handle = null
      this.onclose(e)
      if (e.code === CODE_CUSTOM_DISCONNECT) {
        log.info('custom disconnect, will not reconnect', id)
      } else if (e.code === CODE_GOING_AWAY) {
        log.info('going away, will not reconnect', id)
      } else {
        log.info(`connection closed, trying to reconnect. code: ${e.code}`, id)
        reconnect()
      }
    }
  }

  disconnect() {
    if (this.handle) {
      log.info(`handle existed, closing with code: ${CODE_CUSTOM_DISCONNECT}`)
      this.handle.close(CODE_CUSTOM_DISCONNECT)
    }
  }
}
