const fn = require('./../fn.js')

const countdown = (
  /** @type Object */ settings
) => async (command, client, target, context, msg) => {
  const say = fn.sayFn(client, target)
  const steps = settings.steps
  const interval = settings.interval || 1000
  const msgStep = settings.step || "{step}"
  const msgIntro = settings.intro || null
  const msgOutro = settings.outro || null

  let step = steps
  let next = () => {
    if (step > 0) {
      say(msgStep.replace(/\{step\}/g, step))
      step--
      setTimeout(next, interval)
    } else if (msgOutro) {
      say(msgOutro)
    }
  }

  if (msgIntro) {
    say(msgIntro.replace(/\{steps\}/g, steps))
  }

  setTimeout(next, interval)
}

module.exports = countdown
