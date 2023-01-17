import xhr, { asQueryArgs } from '../../net/xhr'
import { NotFoundError } from './NotFoundError'

export interface IndiviousVideo {
  title: string
  videoId: string
  videoThumbnails: [
    {
      quality: string
      url: string
      width: number
      height: number
    }
  ]

  description: string
  descriptionHtml: string
  published: number
  publishedText: string

  keywords: string[]
  viewCount: number
  likeCount: number
  dislikeCount: number

  paid: boolean
  premium: boolean
  isFamilyFriendly: boolean
  allowedRegions: string[]
  genre: string
  genreUrl: string

  author: string
  authorId: string
  authorUrl: string
  authorThumbnails: [
    {
      url: string
      width: number
      height: number
    }
  ]

  subCountText: string
  lengthSeconds: number
  allowRatings: boolean
  rating: number
  isListed: boolean
  liveNow: boolean
  isUpcoming: boolean
  premiereTimestamp: number | null

  hlsUrl: string | null
  adaptiveFormats: [
    {
      index: string
      bitrate: string
      init: string
      url: string
      itag: string
      type: string
      clen: string
      lmt: string
      projectionType: number
      container: string
      encoding: string
      qualityLabel: string | null
      resolution: string | null
    }
  ]
  formatStreams: [
    {
      url: string
      itag: string
      type: string
      quality: string
      container: string
      encoding: string
      qualityLabel: string
      resolution: string
      size: string
    }
  ]
  captions: [
    {
      label: string
      languageCode: string
      url: string
    }
  ]
  recommendedVideos: [
    {
      videoId: string
      title: string
      videoThumbnails: [
        {
          quality: string
          url: string
          width: number
          height: number
        }
      ]
      author: string
      lengthSeconds: number
      viewCountText: string
    }
  ]
}

interface VideoSearchResultEntry {
  type: "video"
  title: string
  videoId: string
  author: string
  authorId: string
  authorUrl: string
  videoThumbnails: [
    {
      quality: string
      url: string
      width: number
      height: number
    }
  ]
  description: string
  descriptionHtml: string
  viewCount: number
  published: number
  publishedText: string
  lengthSeconds: number
  liveNow: boolean
  paid: boolean
  premium: boolean
}

interface PlaylistSearchResultEntry {
  type: "playlist"
  title: string
  playlistId: string
  author: string
  authorId: string
  authorUrl: string

  videoCount: number
  videos: [
    {
      title: string
      videoId: string
      lengthSeconds: number
      videoThumbnails: [
        {
          quality: string
          url: string
          width: number
          height: number
        }
      ]
    }
  ]
}
interface ChannelSearchResultEntry {
  type: "channel"
  author: string
  authorId: string
  authorUrl: string

  authorThumbnails: [
    {
      url: string
      width: number
      height: number
    }
  ]
  subCount: number
  videoCount: number
  description: string
  descriptionHtml: string
}
type SearchResultEntry = VideoSearchResultEntry | PlaylistSearchResultEntry | ChannelSearchResultEntry
type SearchResult = SearchResultEntry[]

// instances:
// https://api.invidious.io/instances.json?pretty=1&sort_by=version

// const instances = [
//   'https://invidious.nerdvpn.de',
//   'https://invidious.silur.me',
//   'https://invidious.dhusch.de/',
// ]
const BASE_URL = 'https://invidious.nerdvpn.de'

export class Indivious {
  async video(youtubeId: string): Promise<IndiviousVideo> {
    const resp = await xhr.get(`${BASE_URL}/api/v1/videos/${youtubeId}`)
    if (resp.status !== 200) {
      throw new NotFoundError()
    }
    return await resp.json() as IndiviousVideo
  }

  async search(args: {
    q: string,
    page?: number,
    sort_by?: "relevance" | "rating" | "upload_date" | "view_count",
    date?: "hour" | "today" | "week" | "month" | "year",
    duration?: "short" | "long",
    type?: "video" | "playlist" | "channel" | "all",
    features?: string,
    region?: string,
  }): Promise<SearchResult> {
    const resp = await xhr.get(`${BASE_URL}/api/v1/search${asQueryArgs(args)}`)
    if (resp.status !== 200) {
      throw new NotFoundError()
    }
    return await resp.json() as SearchResultEntry[]
  }
}
