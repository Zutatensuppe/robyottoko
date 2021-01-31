const WebSocket = require('ws')
const { nonce } = require('../fn.js')
const { EventHub } = require('../EventHub.js')

const heartbeatInterval = 1000 * 60 //ms between PING's
const reconnectInterval = 1000 * 3 //ms to wait before reconnect

function client() {
  const evts = EventHub()

  let ws

  const send = (message) => {
    const msgStr = JSON.stringify(message)
    try {
      ws.send(msgStr)
      console.log('SENT: ' + msgStr)
    } catch (e) {
      console.log('UNABLE TO SEND: ', e)
      setTimeout(connect, reconnectInterval)
    }
  }

  const heartbeat = () => {
    const message = { type: 'PING' }
    send(message)
  }

  const listen = (topic, authToken) => {
    const message = {
      type: 'LISTEN',
      nonce: nonce(15),
      data: {
        topics: [topic],
        auth_token: authToken
      }
    }
    send(message)
  }

  const connect = () => {
    let heartbeatHandle
    ws = new WebSocket('wss://pubsub-edge.twitch.tv')

    ws.onopen = (event) => {
      console.log('INFO: Socket Opened')
      heartbeat()
      heartbeatHandle = setInterval(heartbeat, heartbeatInterval)
      evts.trigger('open', {})
    }

    ws.onerror = (error) => {
      console.log('ERR:  ' + JSON.stringify(error))
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('RECV: ' + JSON.stringify(message))
      if (message.type == 'RECONNECT') {
        clearInterval(heartbeatHandle)
        console.log('INFO: Reconnecting...')
        setTimeout(connect, reconnectInterval)
      }
      evts.trigger('message', message)
    }

    ws.onclose = () => {
      console.log('INFO: Socket Closed')
      clearInterval(heartbeatHandle)
      console.log('INFO: Reconnecting...')
      setTimeout(connect, reconnectInterval)
    }
  }

  return {
    listen,
    connect,
    on: evts.on,
  }
}

module.exports = {
  client,
}
