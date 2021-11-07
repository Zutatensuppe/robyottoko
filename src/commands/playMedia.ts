import WebSocketServer from "../net/WebSocketServer"
import { CommandFunction, MediaCommand, RawCommand, TwitchChatClient, TwitchChatContext } from "../types"

const playMedia = (
  wss: WebSocketServer,
  userId: number,
  originalCmd: MediaCommand,
): CommandFunction => (
  command: RawCommand | null,
  client: TwitchChatClient | null,
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
