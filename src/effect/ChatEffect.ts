import { getRandom } from "../common/fn";
import { ChatEffectData } from "../types";
import { Effect } from "./Effect";

export class ChatEffect extends Effect<ChatEffectData> {
  async apply(): Promise<void> {
    this.say(await this.doReplacements(getRandom(this.effect.data.text)))
  }
}
