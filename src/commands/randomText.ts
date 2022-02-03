import Variables from '../services/Variables'
import { CommandFunction, RandomTextCommand, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'

const randomText = (
  originalCmd: RandomTextCommand,
  variables: Variables,
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
    const texts = originalCmd.data.text
    const say = fn.sayFn(client, target)
    say(await fn.doReplacements(fn.getRandom(texts), command, context, variables, originalCmd))
  }

export default randomText
