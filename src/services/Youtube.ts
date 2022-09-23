import config from '../config'
import { logger, MINUTE } from '../common/fn'
import xhr, { asQueryArgs, QueryArgsData } from '../net/xhr'

const log = logger('Youtube.ts')

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
  const resp = await xhr.get(url + asQueryArgs(args))
  return await resp.json()
}

const fetchDataByYoutubeId = async (youtubeId: string): Promise<YoutubeVideosResponseDataEntry | null> => {
  let json
  try {
    json = await get('https://www.googleapis.com/youtube/v3/videos', {
      part: 'snippet,status,contentDetails',
      id: youtubeId,
      fields: 'items(id,snippet,status,contentDetails)',
    }) as YoutubeVideosResponseData
    return json.items[0]
  } catch (e) {
    log.error({ e, json, youtubeId })
    return null
  }
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


export enum YoutubeVideoDuration {
  ANY = 'any',
  LONG = 'long',
  MEDIUM = 'medium',
  SHORT = 'short',
}

const msToVideoDurations = (durationMs: number): YoutubeVideoDuration[] => {
  if (durationMs <= 0) {
    return [
      YoutubeVideoDuration.ANY,
      YoutubeVideoDuration.SHORT,
      YoutubeVideoDuration.MEDIUM,
      YoutubeVideoDuration.LONG,
    ]
  }

  if (durationMs < 4 * MINUTE) {
    return [
      YoutubeVideoDuration.ANY,
      YoutubeVideoDuration.SHORT,
    ]
  }

  if (durationMs <= 20 * MINUTE) {
    return [
      YoutubeVideoDuration.ANY,
      YoutubeVideoDuration.SHORT,
      YoutubeVideoDuration.MEDIUM,
    ]
  }

  return [
    YoutubeVideoDuration.ANY,
    YoutubeVideoDuration.SHORT,
    YoutubeVideoDuration.MEDIUM,
    YoutubeVideoDuration.LONG,
  ]
}

// @see https://developers.google.com/youtube/v3/docs/search/list
// videoDuration
//   any – Do not filter video search results based on their duration. This is the default value.
//   long – Only include videos longer than 20 minutes.
//   medium – Only include videos that are between four and 20 minutes long (inclusive).
//   short – Only include videos that are less than four minutes long.
const getYoutubeIdsBySearch = async (
  searchterm: string,
  videoDuration: YoutubeVideoDuration = YoutubeVideoDuration.ANY,
): Promise<string[]> => {
  const searches = [
    `"${searchterm}"`,
    searchterm,
  ]
  const ids: string[] = []
  for (const q of searches) {
    const json = await get('https://www.googleapis.com/youtube/v3/search', {
      part: 'snippet',
      q: q,
      type: 'video',
      videoEmbeddable: 'true',
      videoDuration,
    }) as YoutubeSearchResponseData
    try {
      for (const item of json.items) {
        ids.push(item.id.videoId)
      }
    } catch (e) {
      log.info({ e })
    }
  }
  return ids
}

const getUrlById = (id: string) => `https://youtu.be/${id}`

export default {
  fetchDataByYoutubeId,
  extractYoutubeId,
  msToVideoDurations,
  getYoutubeIdsBySearch,
  getUrlById,
}
