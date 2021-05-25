const fn = require('./../fn.js')

const text = (
  /** @type string */ text
) => async (
  command,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg,
) => {
  const say = fn.sayFn(client, target)
  say(await fn.parseResponseText(text, command))
}

module.exports = text
