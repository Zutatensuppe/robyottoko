import { Bot, CommandExecutionContext, CommandFunction, SetChannelTitleCommand } from '../types'
import fn from './../fn'
import { logger, unicodeLength } from './../common/fn'
import { User } from '../services/Users'
import { getMatchingAccessToken } from '../oauth'

const log = logger('setChannelTitle.ts')

const setChannelTitle = (
  originalCmd: SetChannelTitleCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (ctx: CommandExecutionContext) => {
  const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!ctx.rawCmd || !ctx.context || !helixClient) {
    log.info({
      rawCmd: ctx.rawCmd,
      context: ctx.context,
      helixClient,
    }, 'unable to execute setChannelTitle, client, command, context, or helixClient missing')
    return
  }
  const channelId = ctx.context['room-id']
  const say = bot.sayFn(user, ctx.target)
  const title = originalCmd.data.title === '' ? '$args()' : originalCmd.data.title
  const tmpTitle = await fn.doReplacements(title, ctx.rawCmd, ctx.context, originalCmd, bot, user)
  if (tmpTitle === '') {
    const info = await helixClient.getChannelInformation(channelId)
    if (info) {
      say(`Current title is "${info.title}".`)
    } else {
      say(`❌ Unable to determine current title.`)
    }
    return
  }

  // helix api returns 204 status code even if the title is too long and
  // cant actually be set. but there is no error returned in that case :(
  const len = unicodeLength(tmpTitle)
  const max = 140
  if (len > max) {
    say(`❌ Unable to change title because it is too long (${len}/${max} characters).`)
    return
  }

  const accessToken = await getMatchingAccessToken(channelId, bot, user)
  if (!accessToken) {
    say(`❌ Not authorized to change title.`)
    return
  }

  const resp = await helixClient.modifyChannelInformation(
    accessToken,
    channelId,
    { title: tmpTitle },
    bot,
    user,
  )
  if (resp?.status === 204) {
    say(`✨ Changed title to "${tmpTitle}".`)
  } else {
    say('❌ Unable to change title.')
  }
}

export default setChannelTitle
