import { Bot, CommandFunction, DictLookupCommand, DictSearchResponseDataEntry, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import JishoOrg from './../services/JishoOrg'
import DictCc from './../services/DictCc'
import fn from './../fn'
import { User } from '../services/Users'

type DictFn = (phrase: string) => Promise<DictSearchResponseDataEntry[]>

const jishoOrgLookup = async (
  phrase: string,
) => {
  const data = await JishoOrg.searchWord(phrase)
  if (data.length === 0) {
    return []
  }
  const e = data[0]
  const j = e.japanese[0]
  const d = e.senses[0].english_definitions

  return [{
    from: phrase,
    to: [`${j.word} (${j.reading}) ${d.join(', ')}`],
  }]
}

const LANG_TO_FN: Record<string, DictFn> = {
  ja: jishoOrgLookup,
}
for (const key of Object.keys(DictCc.LANG_TO_URL_MAP)) {
  LANG_TO_FN[key] = (phrase) => DictCc.searchWord(phrase, key)
}

const dictLookup = (
  originalCmd: DictLookupCommand,
  bot: Bot,
  user: User,
  // no params
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  _msg: string | null,
  ) => {
    if (!client || !command) {
      return []
    }
    const variables = bot.getUserVariables(user)
    const say = fn.sayFn(client, target)
    const tmpLang = await fn.doReplacements(originalCmd.data.lang, command, context, variables, originalCmd)
    const dictFn = LANG_TO_FN[tmpLang] || null
    if (!dictFn) {
      say(`Sorry, language not supported: "${tmpLang}"`)
      return
    }

    // if no phrase is setup, use all args given to command
    const phrase = originalCmd.data.phrase === '' ? '$args()' : originalCmd.data.phrase
    const tmpPhrase = await fn.doReplacements(phrase, command, context, variables, originalCmd)

    const items = await dictFn(tmpPhrase)
    if (items.length === 0) {
      say(`Sorry, I didn't find anything for "${tmpPhrase}" in language "${tmpLang}"`)
      return
    }
    for (const item of items) {
      say(`Phrase "${item.from}": ${item.to.join(", ")}`)
    }
  }

export default dictLookup
