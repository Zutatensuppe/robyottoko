import { User } from '../services/Users'
import { Bot, CommandExecutionContext, CommandFunction, RandomTextCommand } from '../types'
import fn from './../fn'

const randomText = (
  originalCmd: RandomTextCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (ctx: CommandExecutionContext) => {
  const texts = originalCmd.data.text
  const say = bot.sayFn(user, ctx.target)
  say(await fn.doReplacements(fn.getRandom(texts), ctx.rawCmd, ctx.context, originalCmd, bot, user))
}

export default randomText
