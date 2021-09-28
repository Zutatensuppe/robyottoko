import WebSocket from 'ws'
import { nonce, SECOND, logger } from '../fn.js'
import { EventHub } from '../EventHub.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

const CODE_GOING_AWAY = 1001
const CODE_CUSTOM_DISCONNECT = 4000

const heartbeatInterval = 60 * SECOND //ms between PING's
const reconnectInterval = 3 * SECOND //ms to wait before reconnect

const log = logger(__filename)

class WsWrapper {
  // actual ws handle
  handle = null

  // timeout for automatic reconnect
  reconnectTimeout = null

  // buffer for 'send'
  sendBuffer = []

  constructor(
    addr,
    protocols,
  ) {
    this.addr = addr
    this.protocols = protocols

    this.onopen = () => { }
    this.onclose = () => { }
    this.onmessage = () => { }
  }

  send(txt) {
    if (this.handle) {
      try {
        this.handle.send(txt)
      } catch (e) {
        this.sendBuffer.push(txt)
      }
    } else {
      this.sendBuffer.push(txt)
    }
  }

  connect() {
    let ws = new WebSocket(this.addr, this.protocols)
    ws.onopen = (e) => {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }
      this.handle = ws
      // should have a queue worker
      while (this.sendBuffer.length > 0) {
        this.handle.send(this.sendBuffer.shift())
      }
      this.onopen(e)
    }
    ws.onmessage = (e) => {
      this.onmessage(e)
    }
    ws.onerror = (e) => {
      log.error('ERR', e)
      this.handle = null
      this.reconnectTimeout = setTimeout(() => { this.connect() }, reconnectInterval)
    }
    ws.onclose = (e) => {
      this.handle = null
      if (e.code === CODE_CUSTOM_DISCONNECT || e.code === CODE_GOING_AWAY) {
        // no need to reconnect on custom disconnect or going away
      } else {
        this.reconnectTimeout = setTimeout(() => { this.connect() }, reconnectInterval)
      }
      this.onclose(e)
    }
  }

  disconnect() {
    if (this.handle) {
      this.handle.close(CODE_CUSTOM_DISCONNECT)
    }
  }
}

function TwitchPubSubClient() {
  const evts = EventHub()

  const ws = new WsWrapper('wss://pubsub-edge.twitch.tv')

  const send = (message) => {
    const msgStr = JSON.stringify(message)
    log.debug('SEND', msgStr)
    ws.send(msgStr)
  }

  const heartbeat = () => {
    send({ type: 'PING' })
  }

  const listen = (topic, authToken) => {
    send({
      type: 'LISTEN',
      nonce: nonce(15),
      data: {
        topics: [topic],
        auth_token: authToken
      }
    })
  }

  let heartbeatHandle
  ws.onopen = (event) => {
    log.info('INFO', 'Socket Opened')
    heartbeat()
    if (heartbeatHandle) {
      clearInterval(heartbeatHandle)
    }
    heartbeatHandle = setInterval(heartbeat, heartbeatInterval)
    evts.trigger('open', {})
  }
  ws.onclose = () => {
    if (heartbeatHandle) {
      clearInterval(heartbeatHandle)
    }
  }
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    log.debug('RECV', JSON.stringify(message))
    if (message.type == 'RECONNECT') {
      log.info('INFO', 'Reconnecting...')
      ws.connect()
    }
    evts.trigger('message', message)
  }

  const connect = () => {
    ws.connect()
  }
  const disconnect = () => {
    ws.disconnect()
  }

  return {
    listen,
    connect,
    disconnect,
    on: evts.on,
  }
}

export default TwitchPubSubClient
