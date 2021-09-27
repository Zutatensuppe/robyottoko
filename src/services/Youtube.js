import config from '../config.js'
import { getJson, asQueryArgs } from '../net/xhr.js'

const get = async (url, args) => {
  args.key = config.modules.sr.google.api_key
  return await getJson(url + asQueryArgs(args))
}

const fetchDataByYoutubeId = async (youtubeId) => {
  const json = await get('https://www.googleapis.com/youtube/v3/videos', {
    part: 'snippet,status,contentDetails',
    id: youtubeId,
    fields: 'items(id,snippet,status,contentDetails)',
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
    // the string may still not be a youtube id
    return string
  }

  return null
}

const getYoutubeIdBySearch = async (searchterm) => {
  const searches = [
    `"${searchterm}"`,
    searchterm,
  ]
  for (const q of searches) {
    const json = await get('https://www.googleapis.com/youtube/v3/search', {
      part: 'snippet',
      q: q,
      type: 'video',
      videoEmbeddable: 'true',
    })
    try {
      const res = json.items[0]['id']['videoId'] || null
      if (res) {
        return res
      }
    } catch (e) {
    }
  }
  return null
}

const getUrlById = (id) => `https://youtu.be/${id}`

export default {
  fetchDataByYoutubeId,
  extractYoutubeId,
  getYoutubeIdBySearch,
  getUrlById,
}
