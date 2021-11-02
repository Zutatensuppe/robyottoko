import config from '../config'
import { getJson, asQueryArgs, QueryArgsData } from '../net/xhr'

interface YoutubeSearchResponseDataEntry {
  id: {
    videoId: string
  }
}

interface YoutubeSearchResponseData {
  items: YoutubeSearchResponseDataEntry[]
}

export interface YoutubeVideosResponseDataEntry {
  snippet: {
    title: string
  }
  contentDetails: {
    duration: string
  }
}

interface YoutubeVideosResponseData {
  items: YoutubeVideosResponseDataEntry[]
}

const get = async (url: string, args: QueryArgsData) => {
  args.key = config.modules.sr.google.api_key
  return await getJson(url + asQueryArgs(args))
}

const fetchDataByYoutubeId = async (youtubeId: string): Promise<YoutubeVideosResponseDataEntry> => {
  const json = await get('https://www.googleapis.com/youtube/v3/videos', {
    part: 'snippet,status,contentDetails',
    id: youtubeId,
    fields: 'items(id,snippet,status,contentDetails)',
  }) as YoutubeVideosResponseData
  return json.items[0] || null
}

const extractYoutubeId = (str: string): string | null => {
  const patterns = [
    /youtu\.be\/(.*?)(?:\?|"|$)/i,
    /\.youtube\.com\/(?:watch\?v=|v\/|embed\/)([^&"'#]*)/i,
  ]
  for (const pattern of patterns) {
    const m = str.match(pattern)
    if (m) {
      return m[1]
    }
  }
  // https://stackoverflow.com/questions/6180138/whats-the-maximum-length-of-a-youtube-video-id
  if (str.match(/^[a-z0-9_-]{11}$/i)) {
    // the string may still not be a youtube id
    return str
  }

  return null
}

const getYoutubeIdBySearch = async (searchterm: string): Promise<string | null> => {
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
    }) as YoutubeSearchResponseData
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

const getUrlById = (id: string) => `https://youtu.be/${id}`

export default {
  fetchDataByYoutubeId,
  extractYoutubeId,
  getYoutubeIdBySearch,
  getUrlById,
}
