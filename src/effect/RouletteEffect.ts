import type { RouletteEffectData } from '../types'
import { Effect } from './Effect'

export class RouletteEffect extends Effect<RouletteEffectData> {
  async apply(): Promise<void> {
    if (this.effect.data.entries.length === 0) {
      return
    }
    this.notifyWs('general', {
      event: 'roulette',
      data: this.effect.data,
      id: this.originalCmd.id,
    })
  }
}
