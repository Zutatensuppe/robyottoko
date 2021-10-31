import Variables from '../services/Variables'
import { TextCommand, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'

const text = (
  variables: Variables,
  originalCmd: TextCommand,
) => async (
  command: RawCommand,
  client: TwitchChatClient,
  target: string,
  context: TwitchChatContext,
  msg: string,
  ) => {
    const text = originalCmd.data.text
    const say = fn.sayFn(client, target)
    say(await fn.doReplacements(text, command, context, variables, originalCmd))
  }

export default text
