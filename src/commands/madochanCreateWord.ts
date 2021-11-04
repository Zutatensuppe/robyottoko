import { RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import Madochan from './../services/Madochan'

const madochanCreateWord = (
  model: string,
  weirdness: number,
) => async (
  command: RawCommand | null,
  client: TwitchChatClient,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    if (!command) {
      return
    }
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
