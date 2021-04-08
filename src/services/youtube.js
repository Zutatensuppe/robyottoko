const config = require('../config.js')
const { getJson } = require('../net/xhr.js')

const fetchDataByYoutubeId = async (youtubeId) => {
  const url = 'https://www.googleapis.com/youtube/v3/videos'
    + '?part=snippet'
    + `&id=${encodeURIComponent(youtubeId)}`
    + '&fields=items(id%2Csnippet)'
    + `&key=${config.modules.sr.google.api_key}`
  const json = await getJson(url)
  return json.items[0] || null
}

const extractYoutubeId = (string) => {
  const patterns = [
    /youtu\.be\/(.*?)(?:\?|"|$)/i,
    /\.youtube\.com\/(?:watch\?v=|v\/|embed\/)([^&"'#]*)/i,
  ]
  for (const pattern of patterns) {
    const m = string.match(pattern)
    if (m) {
      return m[1]
    }
  }
  // https://stackoverflow.com/questions/6180138/whats-the-maximum-length-of-a-youtube-video-id
  if (string.match(/^[a-z0-9_-]{11}$/i)) {
    return string
  }

  return null
}

const getYoutubeIdBySearch = async (searchterm) => {
  const url = 'https://www.googleapis.com/youtube/v3/search'
    + '?part=snippet'
    + `&q=${encodeURIComponent(searchterm)}`
    + '&type=video'
    + `&key=${config.modules.sr.google.api_key}`
  const json = await getJson(url)
  return json.items[0]['id']['videoId'] || null
}

module.exports = {
  fetchDataByYoutubeId,
  extractYoutubeId,
  getYoutubeIdBySearch,
}
