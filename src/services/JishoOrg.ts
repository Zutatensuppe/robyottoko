import { asQueryArgs, logger } from '../common/fn'
import xhr from '../net/xhr'

const log = logger('JishoOrg.ts')

interface JishoJapaneseEntry {
  word?: string
  reading: string
}

interface JishoSenseEntryLink {
  text: string
  url: string
}

interface JishoSenseEntrySource {
  language: string
  word: string
}

interface JishoSenseEntry {
  english_definitions: string[]
  parts_of_speech: string[]
  links: JishoSenseEntryLink[]
  tags: string[]
  restrictions: string[]
  see_also: string[]
  antonyms: string[]
  source: JishoSenseEntrySource[]
  info: string[]
}

interface JishoAttribution {
  jmdict: boolean
  jmnedict: boolean
  dbpedia: false | string
}

interface JishoSearchResponseDataEntry {
  slug: string
  is_common: boolean
  tags: string[]
  jlpt: string[]
  japanese: JishoJapaneseEntry[]
  senses: JishoSenseEntry[]
  attribution: JishoAttribution
}

interface JishoSearchResponseData {
  meta: {
    status: number
  }
  data: JishoSearchResponseDataEntry[]
}

const searchWord = async (
  keyword: string,
  page: number = 1,
): Promise<JishoSearchResponseDataEntry[]> => {
  const url = 'https://jisho.org/api/v1/search/words' + asQueryArgs({
    keyword,
    page,
  })
  try {
    const resp = await xhr.get(url, { headers: { 'user-agent': 'Robyottoko' } })
    const json: JishoSearchResponseData = (await resp.json()) as JishoSearchResponseData
    return json.data
  } catch (e: unknown) {
    log.error(e)
    return []
  }
}

export default {
  searchWord,
}
