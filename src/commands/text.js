import fn from './../fn.ts'

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

export default text
