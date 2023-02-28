import util from './util'
import WsClient from './WsClient'
import mitt from 'mitt'

export const eventBus = mitt()

let client: WsClient | null

let status: any = {
  problems: [],
}

function init() {
  client = util.wsClient('core')
  client.onMessage(['status'], (newStatus) => {
    if (JSON.stringify(status) !== JSON.stringify(newStatus)) {
      status = newStatus
      eventBus.emit('status', status)
    }
  })
  client.connect()
}

function stop() {
  if (client) {
    client.disconnect()
    client = null
  }
}

export default {
  init,
  stop,
  eventBus,
}
