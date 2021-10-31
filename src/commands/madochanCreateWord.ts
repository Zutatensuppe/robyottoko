import { RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import Madochan from './../services/Madochan'

const madochanCreateWord = (
  model: string,
  weirdness: number,
) => async (
  command: RawCommand,
  client: TwitchChatClient,
  target: string,
  context: TwitchChatContext,
  msg: string,
  ) => {
    const say = fn.sayFn(client, target)
    const definition = command.args.join(' ')
    say(`Generating word for "${definition}"...`)
    const data = await Madochan.createWord({
      model: model,
      weirdness: weirdness,
      definition: definition,
    })
    if (data.word === '') {
      say(`Sorry, I could not generate a word :("`)
    } else {
      say(`"${definition}": ${data.word}`)
    }
  }

export default madochanCreateWord
