import { User } from "../services/Users"
import { Bot, CommandFunction, MediaCommand, RawCommand, TwitchChatClient, TwitchChatContext } from "../types"

const playMedia = (
  originalCmd: MediaCommand,
  bot: Bot,
  user: User,
): CommandFunction => (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    const data = originalCmd.data
    bot.getWebSocketServer().notifyAll([user.id], 'general', {
      event: 'playmedia',
      data: data,
    })
  }

export default playMedia
