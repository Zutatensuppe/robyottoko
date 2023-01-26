import { logger } from "../common/fn";
import Madochan from "../services/Madochan";
import { MadochanEffectData } from "../types";
import { Effect } from "./Effect";

const log = logger('MadochanEffect.ts')

export class MadochanEffect extends Effect<MadochanEffectData> {
  async apply(): Promise<void> {
    const model = `${this.effect.data.model}` || Madochan.defaultModel
    const weirdness = parseInt(this.effect.data.weirdness, 10) || Madochan.defaultWeirdness

    if (!this.rawCmd) {
      return
    }

    const definition = this.rawCmd.args.join(' ')
    if (!definition) {
      return
    }

    this.say(`Generating word for "${definition}"...`)
    try {
      const data = await Madochan.createWord({ model, weirdness, definition })
      if (data.word === '') {
        this.say(`Sorry, I could not generate a word :("`)
      } else {
        this.say(`"${definition}": ${data.word}`)
      }
    } catch (e: any) {
      log.error({ e })
      this.say(`Error occured, unable to generate a word :("`)
    }
  }
}
