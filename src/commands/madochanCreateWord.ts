import { CommandFunction, MadochanCommand, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import Madochan from './../services/Madochan'

const madochanCreateWord = (
  originalCmd: MadochanCommand,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  _context: TwitchChatContext | null,
  ) => {
    if (!client || !command) {
      return
    }

    const model = `${originalCmd.data.model}` || Madochan.defaultModel
    const weirdness = parseInt(originalCmd.data.weirdness, 10) || Madochan.defaultWeirdness

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
