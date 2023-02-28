import { logger } from '../common/fn'
import config from '../config'
import { findIdxFuzzy } from '../fn'
import { RemoveStreamTagEffectData } from '../types'
import { Effect } from './Effect'

const log = logger('RemoveStreamTagEffect.ts')

export class RemoveStreamTagEffect extends Effect<RemoveStreamTagEffectData> {
  async apply(): Promise<void> {
    const helixClient = this.getHelixClient()
    if (!this.rawCmd || !this.context || !helixClient) {
      log.info({
        rawCmd: this.rawCmd,
        context: this.context,
        helixClient,
      }, 'unable to execute removeStreamTags, client, command, context, or helixClient missing')
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
    const manualTags = tagsResponse.data.filter(entry => !entry.is_auto)
    const idx = findIdxFuzzy(manualTags, tmpTag, (item) => item.localization_names['en-us'])
    if (idx === -1) {
      const autoTags = tagsResponse.data.filter(entry => entry.is_auto)
      const idx = findIdxFuzzy(autoTags, tmpTag, (item) => item.localization_names['en-us'])
      if (idx === -1) {
        this.say(`❌ No such tag is currently set: ${tmpTag}`)
      } else {
        this.say(`❌ Unable to remove automatic tag: ${autoTags[idx].localization_names['en-us']}`)
      }
      return
    }
    const newTagIds = manualTags.filter((_value, index) => index !== idx).map(entry => entry.tag_id)
    const newSettableTagIds: string[] = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId))

    const accessToken = await this.getAccessToken()
    if (!accessToken) {
      this.say(`❌ Not authorized to remove tag: ${manualTags[idx].localization_names['en-us']}`)
      return
    }

    const resp = await helixClient.replaceStreamTags(
      accessToken,
      newSettableTagIds,
      this.contextModule.bot,
      this.contextModule.user,
    )
    if (!resp || resp.status < 200 || resp.status >= 300) {
      this.say(`❌ Unable to remove tag: ${manualTags[idx].localization_names['en-us']}`)
      return
    }
    this.say(`✨ Removed tag: ${manualTags[idx].localization_names['en-us']}`)
  }
}
