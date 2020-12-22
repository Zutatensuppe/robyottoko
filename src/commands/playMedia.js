const { WebSocketServer } = require("../net")

const playMedia = (
  /** @type WebSocketServer */ wss,
  /** @type String */          userId,
  /** @type Object */          data
) => (command, client, target, context, msg) => {
  wss.notifyAll([userId], 'general', {
    event: 'playmedia',
    data: data,
  })
}

module.exports = playMedia
