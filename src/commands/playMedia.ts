import WebSocketServer from "../net/WebSocketServer"
import { MediaCommand, RawCommand, TwitchChatClient, TwitchChatContext } from "../types"

const playMedia = (
  wss: WebSocketServer,
  userId: number,
  originalCmd: MediaCommand,
) => (
  command: RawCommand,
  client: TwitchChatClient,
  target: string,
  context: TwitchChatContext,
  msg: string,
  ) => {
    const data = originalCmd.data
    wss.notifyAll([userId], 'general', {
      event: 'playmedia',
      data: data,
    })
  }

export default playMedia
