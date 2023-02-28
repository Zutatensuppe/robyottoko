import { logger } from '../common/fn'
import config from '../config'
import { findIdxFuzzy } from '../fn'
import { AddStreamTagEffectData } from '../types'
import { Effect } from './Effect'

const log = logger('AddStreamTagEffect.ts')

export class AddStreamTagEffect extends Effect<AddStreamTagEffectData> {
  async apply(): Promise<void> {
    const helixClient = this.getHelixClient()
    if (!this.rawCmd || !this.context || !helixClient) {
      log.info({
        rawCmd: this.rawCmd,
        context: this.context,
        helixClient,
      }, 'unable to execute addStreamTags, client, command, context, or helixClient missing')
      return
    }
    const tag = this.effect.data.tag === '' ? '$args()' : this.effect.data.tag
    const tmpTag = await this.doReplacements(tag)
    const tagsResponse = await helixClient.getStreamTags(this.contextModule.user.twitch_id)
    if (!tagsResponse) {
      this.say('❌ Unable to fetch current tags.')
      return
    }
    if (tmpTag === '') {
      const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
      this.say(`Current tags: ${names.join(', ')}`)
      return
    }
    const idx = findIdxFuzzy(config.twitch.manual_tags, tmpTag, (item) => item.name)
    if (idx === -1) {
      this.say(`❌ No such tag: ${tmpTag}`)
      return
    }
    const tagEntry = config.twitch.manual_tags[idx]
    const newTagIds = tagsResponse.data.map(entry => entry.tag_id)
    if (newTagIds.includes(tagEntry.id)) {
      const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
      this.say(`✨ Tag ${tagEntry.name} already exists, current tags: ${names.join(', ')}`)
      return
    }

    newTagIds.push(tagEntry.id)
    const newSettableTagIds: string[] = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId))
    if (newSettableTagIds.length > 5) {
      const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
      this.say(`❌ Too many tags already exist, current tags: ${names.join(', ')}`)
      return
    }

    const accessToken = await this.getAccessToken()
    if (!accessToken) {
      this.say(`❌ Not authorized to add tag: ${tagEntry.name}`)
      return
    }

    const resp = await helixClient.replaceStreamTags(
      accessToken,
      newSettableTagIds,
      this.contextModule.bot,
      this.contextModule.user,
    )
    if (!resp || resp.status < 200 || resp.status >= 300) {
      log.error(resp)
      this.say(`❌ Unable to add tag: ${tagEntry.name}`)
      return
    }
    this.say(`✨ Added tag: ${tagEntry.name}`)
  }
}
