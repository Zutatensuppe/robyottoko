import Variables from '../services/Variables'
import { RandomTextCommand, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'

const randomText = (
  variables: Variables,
  originalCmd: RandomTextCommand,
) => async (
  command: RawCommand,
  client: TwitchChatClient,
  target: string,
  context: TwitchChatContext,
  msg: string,
  ) => {
    const texts = originalCmd.data.text
    const say = fn.sayFn(client, target)
    say(await fn.doReplacements(fn.getRandom(texts), command, context, variables, originalCmd))
  }

export default randomText
