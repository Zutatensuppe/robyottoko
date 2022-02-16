import { User } from '../services/Users'
import { Bot, CommandFunction, RandomTextCommand, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'

const randomText = (
  originalCmd: RandomTextCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    if (!client) {
      return
    }
    const variables = bot.getUserVariables(user)
    const texts = originalCmd.data.text
    const say = fn.sayFn(client, target)
    say(await fn.doReplacements(fn.getRandom(texts), command, context, variables, originalCmd))
  }

export default randomText
