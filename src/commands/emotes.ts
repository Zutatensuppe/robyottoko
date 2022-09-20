import { User } from "../services/Users"
import { Bot, CommandExecutionContext, CommandFunction, EmotesCommand } from "../types"
import { logger } from './../common/fn'

const log = logger('emotes.ts')

const emotes = (
  originalCmd: EmotesCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (ctx: CommandExecutionContext) => {
  bot.getWebSocketServer().notifyAll([user.id], 'general', {
    event: 'emotes',
    data: originalCmd.data,
  })
}

export default emotes
