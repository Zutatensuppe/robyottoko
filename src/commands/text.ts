import Variables from '../services/Variables'
import { TextCommand, RawCommand, TwitchChatClient, TwitchChatContext, CommandFunction } from '../types'
import fn from './../fn'

const text = (
  variables: Variables,
  originalCmd: TextCommand,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    if (!client) {
      return
    }
    const text = originalCmd.data.text
    const say = fn.sayFn(client, target)
    say(await fn.doReplacements(text, command, context, variables, originalCmd))
  }

export default text
