const fn = require('./../fn.js')

const randomText = (
  /** @type string[] */ texts
) => async (
  command,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg,
) => {
  const say = fn.sayFn(client, target)
  say(await fn.parseResponseText(fn.getRandom(texts), command))
}

module.exports = randomText
