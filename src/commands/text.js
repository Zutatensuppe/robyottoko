const fn = require('./../fn.js')

const text = (
  /** @type String */ text
) => async (command, client, target, context, msg) => {
  const say = fn.sayFn(client, target)
  say(await fn.parseResponseText(text, command))
}

module.exports = text
