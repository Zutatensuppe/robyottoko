import { CommandFunction, AddStreamTagCommand, Bot, CommandExecutionContext } from '../types'
import fn, { findIdxFuzzy } from './../fn'
import { logger } from './../common/fn'
import config from '../config'
import { User } from '../services/Users'
import { getMatchingAccessToken } from '../oauth'

const log = logger('setStreamTags.ts')

const addStreamTags = (
  originalCmd: AddStreamTagCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (ctx: CommandExecutionContext) => {
  const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!ctx.rawCmd || !ctx.context || !helixClient) {
    log.info({
      rawCmd: ctx.rawCmd,
      context: ctx.context,
      helixClient,
    }, 'unable to execute addStreamTags, client, command, context, or helixClient missing')
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
  const idx = findIdxFuzzy(config.twitch.manual_tags, tmpTag, (item) => item.name)
  if (idx === -1) {
    say(`❌ No such tag: ${tmpTag}`)
    return
  }
  const tagEntry = config.twitch.manual_tags[idx]
  const newTagIds = tagsResponse.data.map(entry => entry.tag_id)
  if (newTagIds.includes(tagEntry.id)) {
    const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
    say(`✨ Tag ${tagEntry.name} already exists, current tags: ${names.join(', ')}`)
    return
  }

  newTagIds.push(tagEntry.id)
  const newSettableTagIds: string[] = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId))
  if (newSettableTagIds.length > 5) {
    const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
    say(`❌ Too many tags already exist, current tags: ${names.join(', ')}`)
    return
  }

  const accessToken = await getMatchingAccessToken(bot, user)
  if (!accessToken) {
    say(`❌ Not authorized to add tag: ${tagEntry.name}`)
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
    log.error(resp)
    say(`❌ Unable to add tag: ${tagEntry.name}`)
    return
  }
  say(`✨ Added tag: ${tagEntry.name}`)
}

export default addStreamTags
