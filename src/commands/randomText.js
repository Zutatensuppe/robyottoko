const fn = require('./../fn.js')

const randomText = (
  /** @type String[] */ texts
) => async (command, client, target, context, msg) => {
  const say = fn.sayFn(client, target)
  say(await fn.parseResponseText(fn.getRandom(texts), command))
}

module.exports = randomText
