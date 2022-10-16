import { Bot, CommandExecutionContext, CommandFunction, RemoveStreamTagCommand } from '../types'
import fn, { findIdxFuzzy } from './../fn'
import { logger } from './../common/fn'
import config from '../config'
import { User } from '../repo/Users'

const log = logger('setStreamTags.ts')

const removeStreamTags = (
  originalCmd: RemoveStreamTagCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (ctx: CommandExecutionContext) => {
  const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!ctx.rawCmd || !ctx.context || !helixClient) {
    log.info({
      rawCmd: ctx.rawCmd,
      context: ctx.context,
      helixClient,
    }, 'unable to execute removeStreamTags, client, command, context, or helixClient missing')
    return
  }
  const channelId = ctx.context['room-id']
  const say = bot.sayFn(user, ctx.target)
  const tag = originalCmd.data.tag === '' ? '$args()' : originalCmd.data.tag
  const tmpTag = await fn.doReplacements(tag, ctx.rawCmd, ctx.context, originalCmd, bot, user)
  const tagsResponse = await helixClient.getStreamTags(channelId)
  if (!tagsResponse) {
    say(`❌ Unable to fetch current tags.`)
    return
  }
  if (tmpTag === '') {
    const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
    say(`Current tags: ${names.join(', ')}`)
    return
  }
  const manualTags = tagsResponse.data.filter(entry => !entry.is_auto)
  const idx = findIdxFuzzy(manualTags, tmpTag, (item) => item.localization_names['en-us'])
  if (idx === -1) {
    const autoTags = tagsResponse.data.filter(entry => entry.is_auto)
    const idx = findIdxFuzzy(autoTags, tmpTag, (item) => item.localization_names['en-us'])
    if (idx === -1) {
      say(`❌ No such tag is currently set: ${tmpTag}`)
    } else {
      say(`❌ Unable to remove automatic tag: ${autoTags[idx].localization_names['en-us']}`)
    }
    return
  }
  const newTagIds = manualTags.filter((_value, index) => index !== idx).map(entry => entry.tag_id)
  const newSettableTagIds: string[] = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId))

  const accessToken = await bot.getRepos().oauthToken.getMatchingAccessToken(user)
  if (!accessToken) {
    say(`❌ Not authorized to remove tag: ${manualTags[idx].localization_names['en-us']}`)
    return
  }

  const resp = await helixClient.replaceStreamTags(
    accessToken,
    channelId,
    newSettableTagIds,
    bot,
    user,
  )
  if (!resp || resp.status < 200 || resp.status >= 300) {
    say(`❌ Unable to remove tag: ${manualTags[idx].localization_names['en-us']}`)
    return
  }
  say(`✨ Removed tag: ${manualTags[idx].localization_names['en-us']}`)
}

export default removeStreamTags
