import { getJson, asQueryArgs } from '../net/xhr'

const searchWord = async (
  /** @type string */ keyword,
  /** @type number */ page = 1,
) => {
  const url = 'https://jisho.org/api/v1/search/words' + asQueryArgs({
    keyword: keyword,
    page: page,
  })
  const json = await getJson(url)
  return json.data
}

export default {
  searchWord,
}
