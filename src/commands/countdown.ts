import WebSocketServer from '../net/WebSocketServer'
import Variables from '../services/Variables'
import { CommandFunction, CountdownCommand, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'

const log = fn.logger('countdown.ts')

const countdown = (
  variables: Variables,
  wss: WebSocketServer,
  userId: number,
  originalCmd: CountdownCommand,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    if (!client) {
      return
    }

    const sayFn = fn.sayFn(client, target)
    const doReplacements = async (text: string) => {
      return await fn.doReplacements(text, command, context, variables, originalCmd)
    }
    const say = async (text: string) => {
      return sayFn(await doReplacements(text))
    }
    const parseDuration = async (str: string) => {
      return fn.mustParseHumanDuration(await doReplacements(str))
    }

    const settings = originalCmd.data

    const t = (settings.type || 'auto')

    let actionDefs: { type: 'text' | 'delay' | 'media', value: string }[] = []
    if (t === 'auto') {
      const steps = parseInt(await doReplacements(`${settings.steps}`), 10)
      const msgStep = settings.step || "{step}"
      const msgIntro = settings.intro || null
      const msgOutro = settings.outro || null

      if (msgIntro) {
        actionDefs.push({ type: 'text', value: msgIntro.replace(/\{steps\}/g, `${steps}`) })
        actionDefs.push({ type: 'delay', value: settings.interval || '1s' })
      }

      for (let step = steps; step > 0; step--) {
        actionDefs.push({
          type: 'text',
          value: msgStep.replace(/\{steps\}/g, `${steps}`).replace(/\{step\}/g, `${step}`),
        })
        actionDefs.push({ type: 'delay', value: settings.interval || '1s' })
      }

      if (msgOutro) {
        actionDefs.push({ type: 'text', value: msgOutro.replace(/\{steps\}/g, `${steps}`) })
      }
    } else if (t === 'manual') {
      actionDefs = settings.actions
    }

    const actions = []
    for (const a of actionDefs) {
      if (a.type === 'text') {
        actions.push(async () => say(a.value))
      } else if (a.type === 'media') {
        actions.push(async () => {
          wss.notifyAll([userId], 'general', {
            event: 'playmedia',
            data: a.value,
          })
        })
      } else if (a.type === 'delay') {
        let duration: number
        try {
          duration = (await parseDuration(a.value)) || 0
        } catch (e: any) {
          log.error(e.message, a.value)
          return
        }
        actions.push(async () => await fn.sleep(duration))
      }
    }

    for (let i = 0; i < actions.length; i++) {
      await actions[i]()
    }
  }

export default countdown
