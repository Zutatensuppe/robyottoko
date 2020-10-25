const fetch = require('node-fetch')
const fn = require('./fn.js')

const jishoOrgLookup = () => async (command, client, target, context, msg) => {
  const say = fn.sayFn(client, target)
  const phrase = command.args.join(' ')
  const data = await fn.lookupWord(phrase)
  if (data.length === 0) {
    say(`Sorry, I didn't find anything for "${phrase}"`)
    return
  }
  const e = data[0]
  const j = e.japanese[0]
  const d = e.senses[0].english_definitions

  say(`Phrase "${phrase}": ${j.word} (${j.reading}) ${d.join(', ')}`)
};

async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

const customApi = async (url) => {
  const res = await fetch(url)
  return await res.text()
}

const parsed = async (text, command) => {
  const replaces = [
    {
      regex: /\$([a-z][a-z0-9]*)(?!\()/g,
      replacer: (m0, m1) => {
        switch (m1) {
          case 'args': return command.args.join(' ')
        }
        return m0
      }
    },
    {
      regex: /\$customapi\(([^$\)]*)\)/g,
      replacer: async (m0, m1) => {
        return await customApi(await parsed(m1, command))
      },
    },
    {
      regex: /\$urlencode\(([^$\)]*)\)/g,
      replacer: async (m0, m1) => {
        return encodeURIComponent(await parsed(m1, command))
      },
    },
  ]
  let replaced = text
  let orig
  do {
    orig = replaced
    for (let replace of replaces) {
      replaced = await replaceAsync(replaced, replace.regex, replace.replacer)
    }
  } while (orig !== replaced)
  return replaced
}

const text = (text) => async (command, client, target, context, msg) => {
  const say = fn.sayFn(client, target)
  say(await parsed(text, command))
}

const randomText = (texts) => async (command, client, target, context, msg) => {
  const say = fn.sayFn(client, target)
  say(await parsed(fn.getRandom(texts), command))
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
