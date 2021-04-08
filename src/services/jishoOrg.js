const { getJson, asQueryArgs } = require('../net/xhr')

const searchWord = async (keyword, page = 1) => {
  const url = 'https://jisho.org/api/v1/search/words' + asQueryArgs({
    keyword: keyword,
    page: page,
  })
  const json = await getJson(url)
  return json.data
}

module.exports = {
  searchWord,
}
