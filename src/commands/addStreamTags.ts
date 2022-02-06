import TwitchHelixClient from '../services/TwitchHelixClient'
import { CommandFunction, RawCommand, AddStreamTagCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn, { findIdxFuzzy } from './../fn'
import { logger } from './../common/fn'
import Variables from '../services/Variables'
import config from '../config'

const log = logger('setStreamTags.ts')

const addStreamTags = (
  originalCmd: AddStreamTagCommand,
  helixClient: TwitchHelixClient | null,
  variables: Variables,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
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
    const tmpTag = await fn.doReplacements(tag, command, context, variables, originalCmd)
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
    if (newTagIds.length >= 5) {
      const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
      say(`❌ Too many tags already exist, current tags: ${names.join(', ')}`)
      return
    }
    newTagIds.push(tagEntry.id)
    const resp = await helixClient.replaceStreamTags(context['room-id'], newTagIds)
    if (!resp || resp.status < 200 || resp.status >= 300) {
      say(`❌ Unable to add tag: ${tagEntry.name}`)
      return
    }
    say(`✨ Added tag: ${tagEntry.name}`)
  }

export default addStreamTags
