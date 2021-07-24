const fn = require('./../fn.js')

const countdown = (
  /** @type Object */ settings
) => async (
  command,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg,
  ) => {
    const sayFn = fn.sayFn(client, target)
    const say = async (text) => {
      return sayFn(await fn.parseResponseText(text, command, context))
    }

    const actions = []
    const t = (settings.type || 'auto')

    if (t === 'auto') {
      const steps = settings.steps
      const interval = settings.interval || (1 * fn.SECOND)
      const msgStep = settings.step || "{step}"
      const msgIntro = settings.intro || null
      const msgOutro = settings.outro || null
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
        } else if (a.type === 'delay') {
          actions.push(async () => await fn.sleep(parseInt(a.value, 10) || 0))
        }
      }
    }

    for (let i = 0; i < actions.length; i++) {
      await actions[i]()
    }
  }

module.exports = countdown
