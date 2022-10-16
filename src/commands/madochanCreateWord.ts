import { logger } from '../common/fn'
import { User } from '../repo/Users'
import { Bot, CommandExecutionContext, CommandFunction, MadochanCommand } from '../types'
import Madochan from './../services/Madochan'

const log = logger('madochanCreateWord.ts')

const madochanCreateWord = (
  originalCmd: MadochanCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (ctx: CommandExecutionContext) => {
  if (!ctx.rawCmd) {
    return
  }

  const model = `${originalCmd.data.model}` || Madochan.defaultModel
  const weirdness = parseInt(originalCmd.data.weirdness, 10) || Madochan.defaultWeirdness

  const say = bot.sayFn(user, ctx.target)
  const definition = ctx.rawCmd.args.join(' ')
  say(`Generating word for "${definition}"...`)
  try {
    const data = await Madochan.createWord({ model, weirdness, definition })
    if (data.word === '') {
      say(`Sorry, I could not generate a word :("`)
    } else {
      say(`"${definition}": ${data.word}`)
    }
  } catch (e: any) {
    log.error({ e })
    say(`Error occured, unable to generate a word :("`)
  }
}

export default madochanCreateWord
