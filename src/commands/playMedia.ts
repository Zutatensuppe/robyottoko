import WebSocketServer from "../net/WebSocketServer"
import { MediaCommand, RawCommand, TwitchChatClient, TwitchChatContext } from "../types"

const playMedia = (
  wss: WebSocketServer,
  userId: number,
  originalCmd: MediaCommand,
) => (
  command: RawCommand | null,
  client: TwitchChatClient,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    const data = originalCmd.data
    wss.notifyAll([userId], 'general', {
      event: 'playmedia',
      data: data,
    })
  }

export default playMedia
