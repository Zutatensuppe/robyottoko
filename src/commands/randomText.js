const fn = require('./../fn.js')

const randomText = (
  /** @type Variables */ variables,
  originalCmd,
) => async (
  command,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg,
  ) => {
    const texts = originalCmd.data.text
    const say = fn.sayFn(client, target)
    say(await fn.doReplacements(fn.getRandom(texts), command, context, variables, originalCmd))
  }

module.exports = randomText
