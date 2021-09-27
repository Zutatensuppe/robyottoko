import fn from './../fn.js'

const log = fn.logger('countdown.js')

const countdown = (
  /** @type Variables */ variables,
  /** @type WebSocketServer */ wss,
  /** @type String */          userId,
  /** @type Object */ originalCmd
) => async (
  command,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg,
  ) => {
    const sayFn = fn.sayFn(client, target)
    const doReplacements = async (text) => {
      return await fn.doReplacements(text, command, context, variables, originalCmd)
    }
    const say = async (text) => {
      return sayFn(await doReplacements(text))
    }
    const parseDuration = async (str) => {
      return fn.mustParseHumanDuration(await doReplacements(str))
    }

    const settings = originalCmd.data

    const actions = []
    const t = (settings.type || 'auto')

    if (t === 'auto') {
      const steps = await doReplacements(settings.steps)
      let interval
      try {
        interval = (await parseDuration(settings.interval)) || (1 * fn.SECOND)
      } catch (e) {
        log.error(e.message, settings.interval)
        return
      }
      const msgStep = settings.step || "{step}"
      const msgIntro = settings.intro || null
      const msgOutro = settings.outro || null
      console.log(steps, settings)
      if (msgIntro) {
        actions.push(async () => await say(msgIntro.replace(/\{steps\}/g, steps)))
        actions.push(async () => await fn.sleep(interval))
      }

      for (let step = steps; step > 0; step--) {
        actions.push(async () => say(msgStep
          .replace(/\{steps\}/g, steps)
          .replace(/\{step\}/g, step)
        ))
        actions.push(async () => await fn.sleep(interval))
      }

      if (msgOutro) {
        actions.push(async () => await say(msgOutro.replace(/\{steps\}/g, steps)))
      }
    } else if (t === 'manual') {
      for (const a of settings.actions) {
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
          let duration
          try {
            duration = (await parseDuration(a.value)) || 0
          } catch (e) {
            log.error(e.message, a.value)
            return
          }
          actions.push(async () => await fn.sleep(duration))
        }
      }
    }

    for (let i = 0; i < actions.length; i++) {
      await actions[i]()
    }
  }

export default countdown
