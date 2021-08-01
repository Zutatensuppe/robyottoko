const fn = require('./../fn.js')

const text = (
  /** @type Variables */ variables,
  originalCmd,
) => async (
  command,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg,
  ) => {
    const text = originalCmd.data.text
    const say = fn.sayFn(client, target)
    say(await fn.doReplacements(text, command, context, variables, originalCmd))
  }

module.exports = text
