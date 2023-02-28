import DictCc from '../services/DictCc'
import JishoOrg from '../services/JishoOrg'
import { DictLookupEffectData, DictSearchResponseDataEntry } from '../types'
import { Effect } from './Effect'

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

export class DictLookupEffect extends Effect<DictLookupEffectData> {
  async apply(): Promise<void> {
    const tmpLang = await this.doReplacements(this.effect.data.lang)
    const dictFn = LANG_TO_FN[tmpLang] || null
    if (!dictFn) {
      this.say(`Sorry, language not supported: "${tmpLang}"`)
      return
    }

    // if no phrase is setup, use all args given to command
    const phrase = this.effect.data.phrase === '' ? '$args()' : this.effect.data.phrase
    const tmpPhrase = await this.doReplacements(phrase)

    const items = await dictFn(tmpPhrase)
    if (items.length === 0) {
      this.say(`Sorry, I didn't find anything for "${tmpPhrase}" in language "${tmpLang}"`)
      return
    }
    for (const item of items) {
      this.say(`Phrase "${item.from}": ${item.to.join(', ')}`)
    }
  }
}
