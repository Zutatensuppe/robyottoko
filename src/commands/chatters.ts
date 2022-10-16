import { Bot, CommandExecutionContext, CommandFunction } from '../types'
import fn from './../fn'
import { logger } from './../common/fn'
import { User } from '../repo/Users'

const log = logger('chatters.ts')

const chatters = (
  bot: Bot,
  user: User
): CommandFunction => async (ctx: CommandExecutionContext) => {
  const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!ctx.context || !helixClient) {
    log.info({
      context: ctx.context,
      helixClient,
    }, 'unable to execute chatters command, client, context, or helixClient missing')
    return
  }

  const say = bot.sayFn(user, ctx.target)

  const stream = await helixClient.getStreamByUserId(ctx.context['room-id'])
  if (!stream) {
    say(`It seems this channel is not live at the moment...`)
    return
  }

  const userNames = await bot.getChatLog().getChatters(ctx.context['room-id'], new Date(stream.started_at))
  if (userNames.length === 0) {
    say(`It seems nobody chatted? :(`)
    return
  }

  say(`Thank you for chatting!`)
  fn.joinIntoChunks(userNames, ', ', 500).forEach(msg => {
    say(msg)
  })
}

export default chatters
