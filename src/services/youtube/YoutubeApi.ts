import { logger, MINUTE } from '../../common/fn'
import xhr, { asQueryArgs, QueryArgsData } from '../../net/xhr'
import { YoutubeConfig } from '../../types'
import { NoApiKeysError } from './NoApiKeysError'
import { QuotaReachedError } from './QuotaReachedError'

const log = logger('YoutubeApi.ts')

interface YoutubeSearchResponseDataEntry {
  id: {
    videoId: string
  }
}

interface YoutubeSearchResponseData {
  items: YoutubeSearchResponseDataEntry[]
}

export interface YoutubeVideosResponseDataEntry {
  id: string
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

export enum YoutubeVideoDuration {
  ANY = 'any',
  LONG = 'long',
  MEDIUM = 'medium',
  SHORT = 'short',
}

export class YoutubeApi {
  #googleApiKeyIndex = 0
  constructor(
    private config: YoutubeConfig,
  ) {
    // pass
  }

  async get (url: string, args: QueryArgsData) {
    if (this.config.googleApiKeys.length === 0) {
      log.error('no google api keys configured')
      throw new NoApiKeysError()
    }

    // cycle through all google api keys until response is ok
    // or reaching the previous api key index
    const indexBefore = this.#googleApiKeyIndex
    do {
      args.key = this.config.googleApiKeys[this.#googleApiKeyIndex]
      const resp = await xhr.get(url + asQueryArgs(args))
      if (resp.status !== 403) {
        // got a ok response, return it
        return await resp.json()
      }

      log.warn('google returned 403 forbidden status, switching api key')
      this.#googleApiKeyIndex++
      if (this.#googleApiKeyIndex > this.config.googleApiKeys.length - 1) {
        this.#googleApiKeyIndex = 0
      }
    } while (this.#googleApiKeyIndex !== indexBefore)

    throw new QuotaReachedError()
  }

  async fetchDataByYoutubeId (youtubeId: string): Promise<YoutubeVideosResponseDataEntry | null> {
    let json
    try {
      json = await this.get('https://www.googleapis.com/youtube/v3/videos', {
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

  static getUrlById (youtubeId: string): string {
    return `https://youtu.be/${youtubeId}`
  }

  msToVideoDurations (durationMs: number): YoutubeVideoDuration[] {
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
  async getYoutubeIdsBySearch (
    searchterm: string,
    videoDuration: YoutubeVideoDuration = YoutubeVideoDuration.ANY,
  ): Promise<string[]> {
    const searches = [
      `"${searchterm}"`,
      searchterm,
    ]
    const ids: string[] = []
    for (const q of searches) {
      const json = await this.get('https://www.googleapis.com/youtube/v3/search', {
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
        log.info({ e, json })
      }
    }
    return ids
  }
}
