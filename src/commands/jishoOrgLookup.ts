import { RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import JishoOrg from './../services/JishoOrg'

const jishoOrgLookup = (
  // no params
) => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    if (!client || !command) {
      return
    }
    const say = fn.sayFn(client, target)
    const phrase = command.args.join(' ')
    const data = await JishoOrg.searchWord(phrase)
    if (data.length === 0) {
      say(`Sorry, I didn't find anything for "${phrase}"`)
      return
    }
    const e = data[0]
    const j = e.japanese[0]
    const d = e.senses[0].english_definitions

    say(`Phrase "${phrase}": ${j.word} (${j.reading}) ${d.join(', ')}`)
  }

export default jishoOrgLookup
