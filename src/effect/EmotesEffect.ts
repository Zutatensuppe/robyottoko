import { EmotesEffectData } from "../types";
import { Effect } from "./Effect";

export class EmotesEffect extends Effect<EmotesEffectData> {
  async apply(): Promise<void> {
    this.notifyWs('general', {
      event: 'emotes',
      data: this.effect.data,
    })
  }
}
