import { logger, mustParseHumanDuration } from '../common/fn'
import { sleep } from '../fn'
import { CountdownAction, CountdownActionType, CountdownEffectData } from '../types'
import { Effect } from './Effect'

const log = logger('CountdownEffect.ts')

type ActionFn = () => Promise<void>

export class CountdownEffect extends Effect<CountdownEffectData> {
  async apply(): Promise<void> {
    const actionDefinitions = await this.buildActionDefinitions()
    const actions = await this.buildActions(actionDefinitions)

    for (let i = 0; i < actions.length; i++) {
      await actions[i]()
    }
  }

  private async buildActions(actionDefinitions: CountdownAction[]): Promise<ActionFn[]> {
    const say = async (text: string) => {
      return this.say(await this.doReplacements(text))
    }
    const parseDuration = async (str: string) => {
      return mustParseHumanDuration(await this.doReplacements(str))
    }

    const actions: ActionFn[] = []
    for (const a of actionDefinitions) {
      if (a.type === CountdownActionType.TEXT) {
        actions.push(async () => say(`${a.value}`))
      } else if (a.type === CountdownActionType.MEDIA) {
        actions.push(async () => {
          this.notifyWs('general', {
            event: 'playmedia',
            data: a.value,
          })
        })
      } else if (a.type === CountdownActionType.DELAY) {
        let duration: number
        try {
          duration = (await parseDuration(`${a.value}`)) || 0
        } catch (e: any) {
          log.error({ message: e.message, value: a.value })
          return []
        }
        actions.push(async () => {
          await sleep(duration)
        })
      } else {
        log.warn({ type: a.type }, 'unknown countdown action type')
      }
    }
    return actions
  }

  private async buildActionDefinitions(): Promise<CountdownAction[]> {
    const t = (this.effect.data.type || 'auto')
    if (t === 'manual') {
      return this.effect.data.actions
    }
    if (t !== 'auto') {
      // unsupported type!
      log.warn({ type: t }, 'unknown countdown type')
      return []
    }

    const actionDefs: CountdownAction[] = []
    const steps = parseInt(await this.doReplacements(`${this.effect.data.steps}`), 10)
    const msgStep = this.effect.data.step || '{step}'
    const msgIntro = this.effect.data.intro || null
    const msgOutro = this.effect.data.outro || null

    if (msgIntro) {
      actionDefs.push({ type: CountdownActionType.TEXT, value: msgIntro.replace(/\{steps\}/g, `${steps}`) })
      actionDefs.push({ type: CountdownActionType.DELAY, value: this.effect.data.interval || '1s' })
    }

    for (let step = steps; step > 0; step--) {
      actionDefs.push({
        type: CountdownActionType.TEXT,
        value: msgStep.replace(/\{steps\}/g, `${steps}`).replace(/\{step\}/g, `${step}`),
      })
      actionDefs.push({ type: CountdownActionType.DELAY, value: this.effect.data.interval || '1s' })
    }

    if (msgOutro) {
      actionDefs.push({ type: CountdownActionType.TEXT, value: msgOutro.replace(/\{steps\}/g, `${steps}`) })
    }
    return actionDefs
  }
}
