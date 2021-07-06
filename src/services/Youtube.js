const config = require('../config.js')
const { getJson, asQueryArgs } = require('../net/xhr.js')

const get = async (url, args) => {
  args.key = config.modules.sr.google.api_key
  return await getJson(url + asQueryArgs(args))
}

const fetchDataByYoutubeId = async (youtubeId) => {
  const json = await get('https://www.googleapis.com/youtube/v3/videos', {
    part: 'snippet',
    id: youtubeId,
    fields: 'items(id,snippet)',
  })
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
  const json = await get('https://www.googleapis.com/youtube/v3/search', {
    part: 'snippet',
    q: searchterm,
    type: 'video',
  })
  try {
    return json.items[0]['id']['videoId'] || null
  } catch (e) {
    return null
  }
}

const getUrlById = (id) => `https://youtu.be/${id}`

module.exports = {
  fetchDataByYoutubeId,
  extractYoutubeId,
  getYoutubeIdBySearch,
  getUrlById,
}
