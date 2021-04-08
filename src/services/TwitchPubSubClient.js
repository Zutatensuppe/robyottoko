const WebSocket = require('ws')
const { nonce, SECOND } = require('../fn.js')
const { EventHub } = require('../EventHub.js')

const heartbeatInterval = 60 * SECOND //ms between PING's
const reconnectInterval = 3 * SECOND //ms to wait before reconnect

class WsWrapper {
  // actual ws handle
  handle = null

  // timeout for automatic reconnect
  reconnectTimeout = null

  // buffer for 'send'
  sendBuffer = []

  constructor(addr, protocols) {
    this.addr = addr
    this.protocols = protocols

    this.onopen = () => {}
    this.onclose = () => {}
    this.onmessage = () => {}
  }

  send (txt) {
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
    ws.onclose = (e) => {
      this.handle = null
      this.reconnectTimeout = setTimeout(() => { this.connect() }, reconnectInterval)
      this.onclose(e)
    }
  }
}

function TwitchPubSubClient() {
  const evts = EventHub()

  const ws = new WsWrapper('wss://pubsub-edge.twitch.tv')

  const send = (message) => {
    const msgStr = JSON.stringify(message)
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
    console.log('INFO: Socket Opened')
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
    console.log('RECV: ' + JSON.stringify(message))
    if (message.type == 'RECONNECT') {
      console.log('INFO: Reconnecting...')
      ws.connect()
    }
    evts.trigger('message', message)
  }

  const connect = () => {
    ws.connect()
  }

  return {
    listen,
    connect,
    on: evts.on,
  }
}

module.exports = TwitchPubSubClient
