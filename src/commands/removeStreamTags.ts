import { Bot, CommandFunction, RawCommand, RemoveStreamTagCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn, { findIdxFuzzy } from './../fn'
import { logger } from './../common/fn'
import { User } from '../services/Users'

const log = logger('setStreamTags.ts')

const removeStreamTags = (
  originalCmd: RemoveStreamTagCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
    if (!client || !command || !context || !helixClient) {
      log.info('client', client)
      log.info('command', command)
      log.info('context', context)
      log.info('helixClient', helixClient)
      log.info('unable to execute removeStreamTags, client, command, context, or helixClient missing')
      return
    }
    const variables = bot.getUserVariables(user)
    const say = fn.sayFn(client, target)
    const tag = originalCmd.data.tag === '' ? '$args()' : originalCmd.data.tag
    const tmpTag = await fn.doReplacements(tag, command, context, variables, originalCmd)
    const tagsResponse = await helixClient.getStreamTags(context['room-id'])
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
    const resp = await helixClient.replaceStreamTags(context['room-id'], newTagIds)
    if (!resp || resp.status < 200 || resp.status >= 300) {
      say(`❌ Unable to remove tag: ${manualTags[idx].localization_names['en-us']}`)
      return
    }
    say(`✨ Removed tag: ${manualTags[idx].localization_names['en-us']}`)
  }

export default removeStreamTags
