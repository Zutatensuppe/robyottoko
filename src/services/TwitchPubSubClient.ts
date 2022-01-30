import WebSocket from 'ws'
import { nonce, SECOND } from '../fn'
import { logger } from '../common/fn'
import EventHub from '../EventHub'

const CODE_GOING_AWAY = 1001
const CODE_CUSTOM_DISCONNECT = 4000

const heartbeatInterval = 60 * SECOND //ms between PING's
const reconnectInterval = 3 * SECOND //ms to wait before reconnect

const log = logger('TwitchPubSubClient.ts')

const PUBSUB_WS_ADDR = 'wss://pubsub-edge.twitch.tv'

type CallbackFunction = (...args: any[]) => void

interface ListenMessage {
  type: 'LISTEN'
  nonce: string
  data: {
    topics: string[]
    auth_token: string
  }
}

interface PingMessage {
  type: 'PING'
}

class TwitchPubSubClient {
  evts: EventHub

  handle: WebSocket | null = null

  // timeout for automatic reconnect
  reconnectTimeout: NodeJS.Timeout | null = null

  // buffer for 'send'
  sendBuffer: string[] = []

  heartbeatHandle: NodeJS.Timeout | null = null

  nonceMessages: Record<string, ListenMessage> = {}

  constructor() {
    this.evts = new EventHub()
  }

  _send(message: ListenMessage | PingMessage) {
    const msgStr = JSON.stringify(message)
    // log.debug('SEND', msgStr)
    if (this.handle) {
      try {
        this.handle.send(msgStr)
      } catch (e) {
        this.sendBuffer.push(msgStr)
      }
    } else {
      this.sendBuffer.push(msgStr)
    }
  }

  _heartbeat() {
    this._send({ type: 'PING' })
  }

  listen(topic: string, authToken: string) {
    const n = nonce(15)
    const message: ListenMessage = {
      type: 'LISTEN',
      nonce: n,
      data: {
        topics: [topic],
        auth_token: authToken,
      }
    }
    this.nonceMessages[n] = message
    this._send(message)
  }

  connect() {
    this.handle = new WebSocket(PUBSUB_WS_ADDR)
    this.handle.onopen = (_e: WebSocket.Event) => {
      if (!this.handle) {
        return
      }
      if (this.handle.readyState !== WebSocket.OPEN) {
        log.error('ERR', `readyState is not OPEN (${WebSocket.OPEN})`)
        return
      }
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }
      // should have a queue worker
      while (this.sendBuffer.length > 0) {
        this.handle.send(this.sendBuffer.shift())
      }
      log.info('INFO', 'Socket Opened')
      this._heartbeat()
      if (this.heartbeatHandle) {
        clearInterval(this.heartbeatHandle)
      }
      this.heartbeatHandle = setInterval(() => {
        this._heartbeat()
      }, heartbeatInterval)
      this.evts.trigger('open', {})
    }
    this.handle.onmessage = (e) => {
      const message = JSON.parse(`${e.data}`)
      if (message.nonce) {
        message.sentData = this.nonceMessages[message.nonce]
        delete this.nonceMessages[message.nonce]
      }

      // log.debug('RECV', JSON.stringify(message))
      if (message.type === 'RECONNECT') {
        log.info('INFO', 'Reconnecting...')
        this.connect()
      }

      this.evts.trigger('message', message)
    }
    this.handle.onerror = (e) => {
      log.error('ERR', e)
      this.handle = null
      this.reconnectTimeout = setTimeout(() => { this.connect() }, reconnectInterval)
    }
    this.handle.onclose = (e) => {
      this.handle = null
      if (e.code === CODE_CUSTOM_DISCONNECT || e.code === CODE_GOING_AWAY) {
        // no need to reconnect on custom disconnect or going away
      } else {
        log.info('INFO', 'Onclose...')
        this.reconnectTimeout = setTimeout(() => { this.connect() }, reconnectInterval)
      }
      if (this.heartbeatHandle) {
        clearInterval(this.heartbeatHandle)
      }
    }
  }

  disconnect() {
    if (this.handle) {
      this.handle.close(CODE_CUSTOM_DISCONNECT)
    }
  }

  on(what: string, cb: CallbackFunction): void {
    this.evts.on(what, cb)
  }
}

export default TwitchPubSubClient
