import { logger } from "../common/fn";
import { joinIntoChunks } from "../fn";
import { ChattersEffectData } from "../types";
import { Effect } from "./Effect";

const log = logger('ChattersEffect.ts')

export class ChattersEffect extends Effect<ChattersEffectData> {
  async apply(): Promise<void> {
    const helixClient = this.getHelixClient()
    if (!this.context || !helixClient) {
      log.info({
        context: this.context,
        helixClient,
      }, 'unable to execute chatters command, client, context, or helixClient missing')
      return
    }

    const stream = await helixClient.getStreamByUserId(this.contextModule.user.twitch_id)
    if (!stream) {
      this.say(`It seems this channel is not live at the moment...`)
      return
    }

    const userNames = await this.contextModule.bot.getRepos().chatLog.getChatters(
      this.contextModule.user.twitch_id,
      new Date(stream.started_at)
    )
    if (userNames.length === 0) {
      this.say(`It seems nobody chatted? :(`)
      return
    }

    this.say(`Thank you for chatting!`)
    joinIntoChunks(userNames, ', ', 500).forEach(msg => {
      this.say(msg)
    })
  }
}
