import { RequestInit } from 'node-fetch'
import { logger } from '../common/fn'
import { postJson, getJson, asJson, withHeaders, asQueryArgs, requestText, request } from '../net/xhr'
import { TwitchChannel } from './TwitchChannels'

const log = logger('TwitchHelixClient.ts')

const API_BASE = 'https://api.twitch.tv/helix'

type TwitchHelixSubscription = any

interface TwitchHelixOauthTokenResponseData {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string[]
  token_type: string
}

interface TwitchHelixUserSearchResponseDataEntry {
  id: string
  login: string
  display_name: string
  type: string
  broadcaster_type: string
  description: string
  profile_image_url: string
  offline_image_url: string
  view_count: number
  email: string
  created_at: string
}

interface TwitchHelixUserSearchResponseData {
  data: TwitchHelixUserSearchResponseDataEntry[]
}

interface TwitchHelixCategorySearchResponseDataEntry {
  id: string
  name: string
  box_art_url: string
}

interface TwitchHelixCategorySearchResponseData {
  data: TwitchHelixCategorySearchResponseDataEntry[]
}

interface TwitchHelixStreamSearchResponseDataEntry {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  type: string
  title: string
  viewer_count: number
  started_at: string
  language: string
  thumbnail_url: string
  tag_ids: string[]
  is_mature: boolean
}

interface TwitchHelixStreamSearchResponseData {
  data: TwitchHelixStreamSearchResponseDataEntry[]
  pagination: {
    cursor: string
  }
}

interface ModifyChannelInformationData {
  game_id?: string
  broadcaster_language?: string
  title?: string
  delay?: number
}

interface TwitchHelixGetChannelInformationResponseDataEntry {
  broadcaster_id: string
  broadcaster_login: string
  broadcaster_name: string
  broadcaster_language: string
  game_id: string
  game_name: string
  title: string
  delay: number
}

interface TwitchHelixGetChannelInformationResponseData {
  data: TwitchHelixGetChannelInformationResponseDataEntry[]
}

class TwitchHelixClient {
  private clientId: string
  private clientSecret: string
  private twitchChannels: TwitchChannel[]

  constructor(
    clientId: string,
    clientSecret: string,
    twitchChannels: TwitchChannel[],
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.twitchChannels = twitchChannels
  }

  _authHeaders(accessToken: string) {
    return {
      'Client-ID': this.clientId,
      'Authorization': `Bearer ${accessToken}`,
    }
  }

  async withAuthHeaders(opts = {}, scopes: string[] = []): Promise<RequestInit> {
    const accessToken = await this.getAccessToken(scopes)
    return withHeaders(this._authHeaders(accessToken), opts)
  }

  _oauthAccessTokenByBroadcasterId(broadcasterId: string): string | null {
    for (const twitchChannel of this.twitchChannels) {
      if (twitchChannel.channel_id === broadcasterId) {
        return twitchChannel.access_token
      }
    }
    return null
  }

  // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
  async getAccessToken(scopes: string[] = []): Promise<string> {
    const url = `https://id.twitch.tv/oauth2/token` + asQueryArgs({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
      scope: scopes.join(' '),
    })
    const json = (await postJson(url)) as TwitchHelixOauthTokenResponseData
    return json.access_token
  }

  _url(path: string): string {
    return `${API_BASE}${path}`
  }

  // https://dev.twitch.tv/docs/api/reference#get-users
  async _getUserBy(query: any): Promise<TwitchHelixUserSearchResponseDataEntry | null> {
    const url = this._url(`/users${asQueryArgs(query)}`)
    const json = await getJson(url, await this.withAuthHeaders()) as TwitchHelixUserSearchResponseData
    try {
      return json.data[0]
    } catch (e) {
      log.error(json)
      return null
    }
  }

  async getUserById(userId: string): Promise<TwitchHelixUserSearchResponseDataEntry | null> {
    return await this._getUserBy({ id: userId })
  }

  async getUserByName(userName: string): Promise<TwitchHelixUserSearchResponseDataEntry | null> {
    return await this._getUserBy({ login: userName })
  }

  async getUserIdByName(userName: string): Promise<string> {
    const user = await this.getUserByName(userName)
    return user ? user.id : ''
  }

  // https://dev.twitch.tv/docs/api/reference#get-streams
  async getStreamByUserId(userId: string) {
    const url = this._url(`/streams${asQueryArgs({ user_id: userId })}`)
    const json = await getJson(url, await this.withAuthHeaders()) as TwitchHelixStreamSearchResponseData
    try {
      return json.data[0]
    } catch (e) {
      log.error(json)
      return null
    }
  }

  async getSubscriptions() {
    const url = this._url('/eventsub/subscriptions')
    return await getJson(url, await this.withAuthHeaders())
  }

  async deleteSubscription(id: string) {
    const url = this._url(`/eventsub/subscriptions${asQueryArgs({ id: id })}`)
    return await requestText('delete', url, await this.withAuthHeaders())
  }

  async createSubscription(subscription: TwitchHelixSubscription) {
    const url = this._url('/eventsub/subscriptions')
    return await postJson(url, await this.withAuthHeaders(asJson(subscription)))
  }

  // https://dev.twitch.tv/docs/api/reference#search-categories
  async searchCategory(searchString: string) {
    const url = this._url(`/search/categories${asQueryArgs({ query: searchString })}`)
    const json = await getJson(url, await this.withAuthHeaders()) as TwitchHelixCategorySearchResponseData
    try {
      return json.data[0]
    } catch (e) {
      log.error(json)
      return null
    }
  }

  // https://dev.twitch.tv/docs/api/reference#get-channel-information
  async getChannelInformation(broadcasterId: string) {
    const url = this._url(`/channels${asQueryArgs({ broadcaster_id: broadcasterId })}`)
    const json = await getJson(url, await this.withAuthHeaders()) as TwitchHelixGetChannelInformationResponseData
    try {
      return json.data[0]
    } catch (e) {
      log.error(json)
      return null
    }
  }

  // https://dev.twitch.tv/docs/api/reference#modify-channel-information
  async modifyChannelInformation(broadcasterId: string, data: ModifyChannelInformationData) {
    const accessToken = this._oauthAccessTokenByBroadcasterId(broadcasterId)
    if (!accessToken) {
      return null
    }

    const url = this._url(`/channels${asQueryArgs({ broadcaster_id: broadcasterId })}`)
    return await request('patch', url, withHeaders(this._authHeaders(accessToken), asJson(data)))
  }
}

export default TwitchHelixClient
