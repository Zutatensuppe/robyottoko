const fetch = require('node-fetch')

const searchWord = async (keyword, page = 1) => {
  const url = 'https://jisho.org/api/v1/search/words'
    + '?keyword=' + encodeURIComponent(keyword)
    + '&page=' + page
  return fetch(url)
    .then(r => r.json())
    .then(j => j.data)
}

module.exports = {
  searchWord,
}
