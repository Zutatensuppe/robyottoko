import { Bot, CommandExecutionContext, CommandFunction, SetChannelGameIdCommand } from '../types'
import fn from './../fn'
import { logger } from './../common/fn'
import { User } from '../services/Users'
import { getMatchingAccessToken } from '../oauth'

const log = logger('setChannelGameId.ts')

const setChannelGameId = (
  originalCmd: SetChannelGameIdCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (ctx: CommandExecutionContext) => {
  const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!ctx.rawCmd || !ctx.context || !helixClient) {
    log.info({
      rawCmd: ctx.rawCmd,
      context: ctx.context,
      helixClient,
    }, 'unable to execute setChannelGameId, client, command, context, or helixClient missing')
    return
  }
  const channelId = ctx.context['room-id']
  const say = bot.sayFn(user, ctx.target)
  const gameId = originalCmd.data.game_id === '' ? '$args()' : originalCmd.data.game_id
  const tmpGameId = await fn.doReplacements(gameId, ctx.rawCmd, ctx.context, originalCmd, bot, user)
  if (tmpGameId === '') {
    const info = await helixClient.getChannelInformation(channelId)
    if (info) {
      say(`Current category is "${info.game_name}".`)
    } else {
      say(`❌ Unable to determine current category.`)
    }
    return
  }

  const category = await helixClient.searchCategory(tmpGameId)
  if (!category) {
    say('🔎 Category not found.')
    return
  }

  const accessToken = await getMatchingAccessToken(channelId, bot, user)
  if (!accessToken) {
    say(`❌ Not authorized to update category.`)
    return
  }

  const resp = await helixClient.modifyChannelInformation(
    accessToken,
    channelId,
    { game_id: category.id },
    bot,
    user,
  )
  if (resp?.status === 204) {
    say(`✨ Changed category to "${category.name}".`)
  } else {
    say('❌ Unable to update category.')
  }
}

export default setChannelGameId
