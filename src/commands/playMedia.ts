import { User } from "../services/Users"
import { Bot, CommandFunction, MediaCommand, RawCommand, TwitchChatClient, TwitchChatContext } from "../types"

const playMedia = (
  originalCmd: MediaCommand,
  bot: Bot,
  user: User,
): CommandFunction => (
  _command: RawCommand | null,
  _client: TwitchChatClient | null,
  _target: string | null,
  _context: TwitchChatContext | null,
  _msg: string | null,
  ) => {
    const data = originalCmd.data
    bot.getWebSocketServer().notifyAll([user.id], 'general', {
      event: 'playmedia',
      data: data,
    })
  }

export default playMedia
