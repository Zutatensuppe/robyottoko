import { CommandFunction, RawCommand, AddStreamTagCommand, TwitchChatClient, TwitchChatContext, Bot } from '../types'
import fn, { findIdxFuzzy } from './../fn'
import { logger } from './../common/fn'
import config from '../config'
import { User } from '../services/Users'

const log = logger('setStreamTags.ts')

const addStreamTags = (
  originalCmd: AddStreamTagCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  _msg: string | null,
  ) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
    if (!client || !command || !context || !helixClient) {
      log.info('client', client)
      log.info('command', command)
      log.info('context', context)
      log.info('helixClient', helixClient)
      log.info('unable to execute addStreamTags, client, command, context, or helixClient missing')
      return
    }
    const say = fn.sayFn(client, target)
    const tag = originalCmd.data.tag === '' ? '$args()' : originalCmd.data.tag
    const tmpTag = await fn.doReplacements(tag, command, context, originalCmd, bot, user)
    const tagsResponse = await helixClient.getStreamTags(context['room-id'])
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

    const resp = await helixClient.replaceStreamTags(context['room-id'], newSettableTagIds)
    if (!resp || resp.status < 200 || resp.status >= 300) {
      log.error(resp)
      say(`❌ Unable to add tag: ${tagEntry.name}`)
      return
    }
    say(`✨ Added tag: ${tagEntry.name}`)
  }

export default addStreamTags
