const { WebSocketServer } = require("../net")

const playMedia = (
  /** @type WebSocketServer */ wss,
  /** @type String */          userId,
  originalCmd,
) => (
  command,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg,
  ) => {
    const data = originalCmd.data
    wss.notifyAll([userId], 'general', {
      event: 'playmedia',
      data: data,
    })
  }

module.exports = playMedia
