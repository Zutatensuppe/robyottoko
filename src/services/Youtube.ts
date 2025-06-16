import { logger } from '../common/fn'
import fn from '../fn'
import type Cache from './Cache'
import type { Invidious, InvidiousVideo } from './youtube/Indivious'
import { NoApiKeysError } from './youtube/NoApiKeysError'
import { NotFoundError } from './youtube/NotFoundError'
import { QuotaReachedError } from './youtube/QuotaReachedError'
import { TooLongError } from './youtube/TooLongError'
import type { YoutubeVideosResponseDataEntry } from './youtube/YoutubeApi'
import { YoutubeApi } from './youtube/YoutubeApi'

const log = logger('Youtube.ts')

export interface YoutubeVideoEntry {
  id: string
  title: string
  durationMs: number
}

export class Youtube {
  constructor(
    private youtubeApi: YoutubeApi,
    private invidious: Invidious,
    private cache: Cache,
  ) {
    // pass
  }

  static extractYoutubeId (str: string): string | null {
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

  static getUrlById(youtubeId: string): string {
    return YoutubeApi.getUrlById(youtubeId)
  }

  static isTooLong(
    maxLenMs: number,
    songLenMs: number,
  ): boolean {
    if (maxLenMs <= 0) {
      return false
    }
    return songLenMs > maxLenMs
  }

  async #getDataByIdViaYoutubeApi(
    youtubeId: string,
  ): Promise<YoutubeVideosResponseDataEntry | null> {
    const key = `youtubeData_${youtubeId}_20210717_2`
    let d = await this.cache.get(key)
    if (d === undefined) {
      d = await this.youtubeApi.fetchDataByYoutubeId(youtubeId)
      if (d) {
        await this.cache.set(key, d, Infinity)
      }
    }
    return d
  }

  async #findViaYoutubeApi(str: string, maxLenMs: number): Promise<YoutubeVideoEntry> {
    const youtubeUrl = str.trim()

    const youtubeId = Youtube.extractYoutubeId(youtubeUrl)
    if (youtubeId) {
      const youtubeData = await this.#getDataByIdViaYoutubeApi(youtubeId)
      if (youtubeData) {
        if (Youtube.isTooLong(maxLenMs, fn.parseISO8601Duration(youtubeData.contentDetails.duration))) {
          throw new TooLongError()
        }
        return {
          id: youtubeData.id,
          title: youtubeData.snippet.title,
          durationMs: fn.parseISO8601Duration(youtubeData.contentDetails.duration),
        }
      }
    }

    let tooLong = false
    for (const duration of this.youtubeApi.msToVideoDurations(maxLenMs)) {
      const youtubeIds = await this.youtubeApi.getYoutubeIdsBySearch(youtubeUrl, duration)
      for (const youtubeId of youtubeIds) {
        const youtubeData = await this.#getDataByIdViaYoutubeApi(youtubeId)
        if (!youtubeData) {
          continue
        }
        if (Youtube.isTooLong(maxLenMs, fn.parseISO8601Duration(youtubeData.contentDetails.duration))) {
          tooLong = true
          continue
        }
        return {
          id: youtubeData.id,
          title: youtubeData.snippet.title,
          durationMs: fn.parseISO8601Duration(youtubeData.contentDetails.duration),
        }
      }
    }

    if (tooLong) {
      throw new TooLongError()
    }

    throw new NotFoundError()
  }

  async #getDataByIdViaIndivious(
    youtubeId: string,
  ): Promise<InvidiousVideo | null> {
    const key = `invidiousData_${youtubeId}_20230117_1`
    let d = await this.cache.get(key)
    if (d === undefined) {
      d = await this.invidious.video(youtubeId)
      if (d) {
        await this.cache.set(key, d, Infinity)
      }
    }
    return d
  }

  async #findByIndivious(str: string, maxLenMs: number): Promise<YoutubeVideoEntry> {
    const youtubeUrl = str.trim()

    const youtubeId = Youtube.extractYoutubeId(youtubeUrl)
    if (youtubeId) {
      const data = await this.#getDataByIdViaIndivious(youtubeId)
      if (data) {
        const durationMs = data.lengthSeconds * 1000
        if (Youtube.isTooLong(maxLenMs, durationMs)) {
          throw new TooLongError()
        }
        return { id: data.videoId, title: data.title, durationMs }
      }
    }

    let tooLong = false
    const durations = ['short', 'long'] as any
    for (const duration of durations) {
      const results = await this.invidious.search({
        q: youtubeUrl,
        type: 'video',
        region: 'DE',
        sort_by: 'relevance',
        duration,
      })
      for (const result of results) {
        if (result.type !== 'video') {
          continue
        }

        const durationMs = result.lengthSeconds * 1000
        if (Youtube.isTooLong(maxLenMs, durationMs)) {
          tooLong = true
          continue
        }
        return { id: result.videoId, title: result.title, durationMs }
      }
    }

    if (tooLong) {
      throw new TooLongError()
    }

    throw new NotFoundError()
  }

  async find(str: string, maxLenMs: number): Promise<YoutubeVideoEntry> {
    try {
      return await this.#findViaYoutubeApi(str, maxLenMs)
    } catch (e) {
      log.info(e instanceof NoApiKeysError)
      // in case of quota reached or no api key set, ask invidious
      if (
        e instanceof QuotaReachedError
        || e instanceof NoApiKeysError
      ) {
        return await this.#findByIndivious(str, maxLenMs)
      }
      throw e
    }
  }
}
