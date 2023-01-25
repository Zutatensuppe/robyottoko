import { logger, unicodeLength } from "../common/fn";
import { SetChannelTitleEffectData } from "../types";
import { Effect } from "./Effect";

const log = logger('SetChannelTitleEffect.ts')

export class SetChannelTitleEffect extends Effect<SetChannelTitleEffectData> {
  async apply(): Promise<void> {
    const helixClient = this.getHelixClient()
    if (!this.rawCmd || !this.context || !helixClient) {
      log.info({
        rawCmd: this.rawCmd,
        context: this.context,
        helixClient,
      }, 'unable to execute setChannelTitle, client, command, context, or helixClient missing')
      return
    }
    const title = this.effect.data.title === '' ? '$args()' : this.effect.data.title
    const tmpTitle = await this.doReplacements(title)
    if (tmpTitle === '') {
      const info = await helixClient.getChannelInformation(this.contextModule.user.twitch_id)
      if (info) {
        this.say(`Current title is "${info.title}".`)
      } else {
        this.say(`❌ Unable to determine current title.`)
      }
      return
    }

    // helix api returns 204 status code even if the title is too long and
    // cant actually be set. but there is no error returned in that case :(
    const len = unicodeLength(tmpTitle)
    const max = 140
    if (len > max) {
      this.say(`❌ Unable to change title because it is too long (${len}/${max} characters).`)
      return
    }

    const accessToken = await this.getAccessToken()
    if (!accessToken) {
      this.say(`❌ Not authorized to change title.`)
      return
    }

    const resp = await helixClient.modifyChannelInformation(
      accessToken,
      { title: tmpTitle },
      this.contextModule.bot,
      this.contextModule.user,
    )
    if (resp?.status === 204) {
      this.say(`✨ Changed title to "${tmpTitle}".`)
    } else {
      this.say('❌ Unable to change title.')
    }
  }
}
