import { logger } from "../common/fn";
import { SetChannelGameIdEffectData } from "../types";
import { Effect } from "./Effect";

const log = logger('SetChannelGameIdEffect.ts')

export class SetChannelGameIdEffect extends Effect<SetChannelGameIdEffectData> {
  async apply(): Promise<void> {
    const helixClient = this.getHelixClient()
    if (!this.rawCmd || !this.context || !helixClient) {
      log.info({
        rawCmd: this.rawCmd,
        context: this.context,
        helixClient,
      }, 'unable to execute setChannelGameId, client, command, context, or helixClient missing')
      return
    }
    const gameId = this.effect.data.game_id === '' ? '$args()' : this.effect.data.game_id
    const tmpGameId = await this.doReplacements(gameId)
    if (tmpGameId === '') {
      const info = await helixClient.getChannelInformation(this.contextModule.user.twitch_id)
      if (info) {
        this.say(`Current category is "${info.game_name}".`)
      } else {
        this.say(`❌ Unable to determine current category.`)
      }
      return
    }

    const category = await helixClient.searchCategory(tmpGameId)
    if (!category) {
      this.say('🔎 Category not found.')
      return
    }

    const accessToken = await this.getAccessToken()
    if (!accessToken) {
      this.say(`❌ Not authorized to update category.`)
      return
    }

    const resp = await helixClient.modifyChannelInformation(
      accessToken,
      { game_id: category.id },
      this.contextModule.bot,
      this.contextModule.user,
    )
    if (resp?.status === 204) {
      this.say(`✨ Changed category to "${category.name}".`)
    } else {
      this.say('❌ Unable to update category.')
    }
  }
}
