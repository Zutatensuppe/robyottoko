const fn = require('./fn.js')

const jishoOrgLookup = () => async (command, client, target, context, msg) => {
  const phrase = command.args.join(' ')
  const data = await fn.lookupWord(phrase)
  if (data.length === 0) {
    return `Sorry, I didn't find anything for "${phrase}"`
  }
  const e = data[0]
  const j = e.japanese[0]
  const d = e.senses[0].english_definitions
  return `Phrase "${phrase}": ${j.word} (${j.reading}) ${d.join(', ')}`
};

const text = (text) => async (command, client, target, context, msg) => {
  return text;
}

const randomText = (texts) => async (command, client, target, context, msg) => {
  return fn.getRandom(texts);
}

const countdown = (settings) => async (command, client, target, context, msg) => {
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

module.exports = {
  jishoOrgLookup,
  text,
  randomText,
  countdown,
}
