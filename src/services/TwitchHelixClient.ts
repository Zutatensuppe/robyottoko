import type { RequestInit, Response } from 'node-fetch'
import { asQueryArgs, getRandom, logger, SECOND, toJSONDateString } from '../common/fn'
import { findIdxFuzzy } from '../fn'
import xhr, { asJson, withHeaders } from '../net/xhr'
import type { Bot, UserId } from '../types'
import type Cache from './Cache'
import type { SubscriptionType } from './twitch/EventSub'
import type { User } from '../repo/Users'

const log = logger('TwitchHelixClient.ts')

const API_BASE = 'https://api.twitch.tv/helix'
const TOKEN_ENDPOINT = 'https://id.twitch.tv/oauth2/token'

const apiUrl = (path: string): string => `${API_BASE}${path}`

// TODO: condition can be different depending on type
interface TwitchHelixSubscription {
  type: SubscriptionType
  version: string
  condition: {
    broadcaster_user_id: string
  } | {
    to_broadcaster_user_id: string
  }
  transport: {
    method: string
    callback: string
    secret: string
  }
}

interface TwitchHelixSubscriptionResponseData {
  data: {
    id: string
    status: string // 'webhook_callback_verification_pending'
    cost: number
    created_at: string // json date

    type: string // todo: define exact types
    version: number
    condition: {
      broadcaster_user_id: string
    }
    transport: {
      method: string
      callback: string
    }
  }[]
  total: number
  total_cost: number
  max_total_cost: number
}

interface TwitchHelixSubscriptionConflictResponseData {
  error: string
  status: number
  message: string
}

export interface TwitchHelixOauthTokenResponseData {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string[]
  token_type: string
}

export interface TwitchHelixChannelEmotesResponseData {
  data: {
    id: string
    name: string
    images: {
      'url_1x': string
      'url_2x': string
      'url_4x': string
    },
    tier: string
    emote_type: string
    emote_set_id: string
    format: string[]
    scale: string[]
    theme_mode: string[]
  }[]
  template: string
}

export interface TwitchHelixGlobalEmotesResponseData {
  data: {
    id: string
    name: string
    images: {
      'url_1x': string
      'url_2x': string
      'url_4x': string
    },
    format: string[]
    scale: string[]
    theme_mode: string[]
  }[]
  template: string
}

export interface TwitchHelixUserSearchResponseDataEntry {
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

interface TwitchHelixClipSearchResponseDataEntry {
  id: string
  url: string
  embed_url: string
  broadcaster_id: string
  broadcaster_name: string
  creator_id: string
  creator_name: string
  video_id: string
  game_id: string
  language: string
  title: string
  view_count: number
  created_at: string
  thumbnail_url: string
  duration: number
}

interface TwitchHelixClipSearchResponseData {
  data: TwitchHelixClipSearchResponseDataEntry[]
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

interface TwitchHelixGetStreamTagsResponseDataEntry {
  tag_id: string
  is_auto: boolean
  localization_names: Record<string, string>
  localization_descriptions: Record<string, string>
}

interface TwitchHelixGetStreamTagsResponseData {
  data: TwitchHelixGetStreamTagsResponseDataEntry[]
  pagination: {
    cursor: string
  }
}

interface TwitchHelixGetChannelPointsCustomRewardsResponseDataEntry {
  broadcaster_name: string
  broadcaster_login: string
  broadcaster_id: string
  id: string
  image: any
  background_color: string
  is_enabled: boolean
  cost: number
  title: string
  prompt: string
  is_user_input_required: boolean
  max_per_stream_setting: {
    is_enabled: boolean
    max_per_stream: number
  }
  max_per_user_per_stream_setting: {
    is_enabled: boolean
    max_per_user_per_stream: number
  }
  global_cooldown_setting: {
    is_enabled: boolean
    global_cooldown_seconds: number
  }
  is_paused: boolean
  is_in_stock: boolean
  default_image: {
    url_1x: string
    url_2x: string
    url_4x: string
  }
  should_redemptions_skip_request_queue: boolean
  redemptions_redeemed_current_stream: any
  cooldown_expires_at: any
}

interface TwitchHelixGetChannelPointsCustomRewardsResponseData {
  data: TwitchHelixGetChannelPointsCustomRewardsResponseDataEntry[]
}

interface ValidateOAuthTokenResponse {
  valid: boolean
  data: any // raw data
}

export function getBestEntryFromCategorySearchItems(
  searchString: string,
  resp: TwitchHelixCategorySearchResponseData,
): TwitchHelixCategorySearchResponseDataEntry | null {
  const idx = findIdxFuzzy(resp.data, searchString, (item) => item.name)
  return idx === -1 ? null : resp.data[idx]
}

export class TwitchHelixClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
  }

  private _authHeaders(accessToken: string) {
    return {
      'Client-ID': this.clientId,
      'Authorization': `Bearer ${accessToken}`,
    }
  }

  private async withAuthHeaders(opts = {}): Promise<RequestInit> {
    const accessToken = await this.getAccessToken()
    return withHeaders(this._authHeaders(accessToken), opts)
  }

  public async getAccessTokenByCode(
    code: string,
    redirectUri: string,
  ): Promise<TwitchHelixOauthTokenResponseData | null> {
    const url = TOKEN_ENDPOINT + asQueryArgs({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })
    try {
      const resp = await xhr.post(url)
      if (!resp.ok) {
        const txt = await resp.text()
        log.warn({ txt, status: resp.status, twitchClientId: this.clientId }, 'unable to get access_token by code')
        return null
      }
      return (await resp.json()) as TwitchHelixOauthTokenResponseData
    } catch (e) {
      log.error({ url, e })
      return null
    }
  }

  // https://dev.twitch.tv/docs/authentication/refresh-tokens
  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<TwitchHelixOauthTokenResponseData | null> {
    const url = TOKEN_ENDPOINT + asQueryArgs({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    try {
      const resp = await xhr.post(url)
      if (!resp.ok) {
        const txt = await resp.text()
        log.warn({ txt, status: resp.status, twitchClientId: this.clientId }, 'unable to refresh access_token')
        return null
      }
      return (await resp.json()) as TwitchHelixOauthTokenResponseData
    } catch (e) {
      log.error({ url, e })
      return null
    }
  }

  // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
  private async getAccessToken(): Promise<string> {
    const url = TOKEN_ENDPOINT + asQueryArgs({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
    })
    let json
    try {
      const resp = await xhr.post(url)
      if (!resp.ok) {
        const txt = await resp.text()
        log.warn({ txt, status: resp.status, twitchClientId: this.clientId }, 'unable to get access_token')
        return ''
      }
      json = (await resp.json()) as TwitchHelixOauthTokenResponseData
      return json.access_token
    } catch (e) {
      log.error({ url, json, e })
      return ''
    }
  }

  // https://dev.twitch.tv/docs/irc/emotes
  public async getChannelEmotes(
    broadcasterId: string,
  ): Promise<TwitchHelixChannelEmotesResponseData | null> {
    // eg. /chat/emotes?broadcaster_id=141981764
    const url = apiUrl('/chat/emotes') + asQueryArgs({ broadcaster_id: broadcasterId })
    let json
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      json = (await resp.json()) as TwitchHelixChannelEmotesResponseData
      return json
    } catch (e) {
      log.error({ url, json, e })
      return null
    }
  }

  // https://dev.twitch.tv/docs/irc/emotes
  public async getGlobalEmotes(): Promise<TwitchHelixGlobalEmotesResponseData | null> {
    const url = apiUrl('/chat/emotes/global')
    let json
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      json = (await resp.json()) as TwitchHelixGlobalEmotesResponseData
      return json
    } catch (e) {
      log.error({ url, json, e })
      return null
    }
  }

  public async getUser(accessToken: string): Promise<TwitchHelixUserSearchResponseDataEntry | null> {
    const url = apiUrl('/users')
    let json
    try {
      const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}))
      json = (await resp.json()) as TwitchHelixUserSearchResponseData
      return json.data[0]
    } catch (e) {
      log.error({ url, json, e })
      return null
    }
  }

  // https://dev.twitch.tv/docs/api/reference#get-users
  private async _getUserBy(query: any): Promise<TwitchHelixUserSearchResponseDataEntry | null> {
    const url = apiUrl('/users') + asQueryArgs(query)
    let json
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      json = (await resp.json()) as TwitchHelixUserSearchResponseData
      return json.data[0]
    } catch (e) {
      log.error({ url, json, e })
      return null
    }
  }

  public async getUserByName(userName: string): Promise<TwitchHelixUserSearchResponseDataEntry | null> {
    return await this._getUserBy({ login: userName })
  }

  public async getUserIdByNameCached(userName: string, cache: Cache): Promise<string> {
    const cacheKey = `TwitchHelixClient::getUserIdByNameCached(${userName})`
    let userId = await cache.get(cacheKey)
    if (userId === undefined) {
      userId = await this._getUserIdByNameUncached(userName)
      await cache.set(cacheKey, userId, Infinity)
    }
    return `${userId}`
  }

  private async _getUserIdByNameUncached(userName: string): Promise<string> {
    const user = await this.getUserByName(userName)
    return user ? String(user.id) : ''
  }

  // https://dev.twitch.tv/docs/api/reference#get-clips
  public async getClipByUserId(
    userId: string,
    startedAtRfc3339: string,
    endedAtRfc3339: string,
    maxDurationSeconds: number,
  ): Promise<TwitchHelixClipSearchResponseDataEntry | null> {
    const url = apiUrl('/clips') + asQueryArgs({
      broadcaster_id: userId,
      started_at: startedAtRfc3339,
      ended_at: endedAtRfc3339,
    })
    let json
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      json = (await resp.json()) as TwitchHelixClipSearchResponseData
      const filtered = json.data.filter(item => item.duration <= maxDurationSeconds)
      return getRandom(filtered)
    } catch (e) {
      log.error({ url, json, e })
      return null
    }
  }

  public async getStreamByUserIdCached(
    userId: string,
    cache: Cache,
  ): Promise<TwitchHelixStreamSearchResponseDataEntry | null> {
    const cacheKey = `TwitchHelixClient::getStreamByUserIdCached(${userId})`
    let stream = await cache.get(cacheKey)
    if (stream === undefined) {
      stream = await this.getStreamByUserId(userId)
      await cache.set(cacheKey, stream, 30 * SECOND)
    }
    return stream
  }

  // https://dev.twitch.tv/docs/api/reference#get-streams
  public async getStreamByUserId(
    userId: string,
  ): Promise<TwitchHelixStreamSearchResponseDataEntry | null> {
    const url = apiUrl('/streams') + asQueryArgs({ user_id: userId })
    let json
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      json = (await resp.json()) as TwitchHelixStreamSearchResponseData
      return json.data[0] || null
    } catch (e) {
      log.error({ url, json, e })
      return null
    }
  }

  public async getSubscriptions() {
    const url = apiUrl('/eventsub/subscriptions')
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      return await resp.json()
    } catch (e) {
      log.error({ url, e })
      return null
    }
  }

  public async deleteSubscription(id: string) {
    const url = apiUrl('/eventsub/subscriptions') + asQueryArgs({ id: id })
    try {
      const resp = await xhr.delete(url, await this.withAuthHeaders())
      return await resp.text()
    } catch (e) {
      log.error({ url, e })
      return null
    }
  }

  // https://dev.twitch.tv/docs/eventsub/manage-subscriptions#subscribing-to-events
  public async createSubscription(
    subscription: TwitchHelixSubscription,
  ): Promise<TwitchHelixSubscriptionResponseData | TwitchHelixSubscriptionConflictResponseData | null> {
    const url = apiUrl('/eventsub/subscriptions')
    try {
      const resp = await xhr.post(url, await this.withAuthHeaders(asJson(subscription)))
      const json = await resp.json() as TwitchHelixSubscriptionResponseData | TwitchHelixSubscriptionConflictResponseData
      return json
    } catch (e) {
      log.error({ url, e })
      return null
    }
  }

  // https://dev.twitch.tv/docs/api/reference#search-categories
  public async searchCategory(
    searchString: string,
  ): Promise<TwitchHelixCategorySearchResponseDataEntry | null> {
    const url = apiUrl('/search/categories') + asQueryArgs({ query: searchString })
    let json
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      json = (await resp.json()) as TwitchHelixCategorySearchResponseData
      return getBestEntryFromCategorySearchItems(searchString, json)
    } catch (e) {
      log.error({ url, json })
      return null
    }
  }

  // https://dev.twitch.tv/docs/api/reference#get-channel-information
  public async getChannelInformation(
    broadcasterId: string,
  ): Promise<TwitchHelixGetChannelInformationResponseDataEntry | null> {
    const url = apiUrl('/channels') + asQueryArgs({ broadcaster_id: broadcasterId })
    let json
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      json = (await resp.json()) as TwitchHelixGetChannelInformationResponseData
      return json.data[0]
    } catch (e) {
      log.error({ url, json })
      return null
    }
  }

  // https://dev.twitch.tv/docs/api/reference#modify-channel-information
  public async modifyChannelInformation(
    accessToken: string,
    data: ModifyChannelInformationData,
    bot: Bot,
    user: User,
  ): Promise<Response | null> {
    const url = apiUrl('/channels') + asQueryArgs({ broadcaster_id: user.twitch_id })
    const req = async (token: string): Promise<Response> => {
      return await xhr.patch(url, withHeaders(this._authHeaders(token), asJson(data)))
    }
    return await this.executeRequestWithRetry(accessToken, req, bot, user, url)
  }

  public async getAllTags(): Promise<TwitchHelixGetStreamTagsResponseDataEntry[]> {
    const allTags: TwitchHelixGetStreamTagsResponseDataEntry[] = []
    let cursor: any = null
    const first = 100
    do {
      const url = apiUrl('/tags/streams') + asQueryArgs(
        cursor ? { after: cursor, first } : { first },
      )
      const resp = await xhr.get(url, await this.withAuthHeaders())
      const json = (await resp.json()) as TwitchHelixGetStreamTagsResponseData
      const entries = json.data
      allTags.push(...entries)
      cursor = json.pagination.cursor // is undefined when there are no more pages
    } while (cursor)
    return allTags
  }

  // https://dev.twitch.tv/docs/api/reference#get-stream-tags
  public async getStreamTags(
    broadcasterId: string,
  ): Promise<TwitchHelixGetStreamTagsResponseData | null> {
    const url = apiUrl('/streams/tags') + asQueryArgs({ broadcaster_id: broadcasterId })
    try {
      const resp = await xhr.get(url, await this.withAuthHeaders())
      return (await resp.json()) as TwitchHelixGetStreamTagsResponseData
    } catch (e) {
      log.error({ url, e })
      return null
    }
  }

  // https://dev.twitch.tv/docs/api/reference#get-custom-reward
  private async getChannelPointsCustomRewards(
    accessToken: string,
    broadcasterId: string,
    bot: Bot,
    user: User,
  ): Promise<Response | null> {
    const url = apiUrl('/channel_points/custom_rewards') + asQueryArgs({ broadcaster_id: broadcasterId })
    const req = async (token: string): Promise<Response> => {
      return await xhr.get(url, withHeaders(this._authHeaders(token)))
    }
    return await this.executeRequestWithRetry(accessToken, req, bot, user, url)
  }

  public async getAllChannelPointsCustomRewards(
    bot: Bot,
    user: User,
  ): Promise<Record<string, string[]>> {
    const rewards: Record<string, string[]> = {}
    if (!user.twitch_id || !user.twitch_login) {
      log.info('getAllChannelPointsCustomRewards: no twitch id and login')
      return rewards
    }
    const accessToken = await bot.getRepos().oauthToken.getMatchingAccessToken(user)
    if (!accessToken) {
      log.info('getAllChannelPointsCustomRewards: no access token')
      return rewards
    }

    const resp = await this.getChannelPointsCustomRewards(
      accessToken,
      user.twitch_id,
      bot,
      user,
    )
    if (resp) {
      const json = await resp.json() as any
      if (!json.error) {
        rewards[user.twitch_login] = (json as TwitchHelixGetChannelPointsCustomRewardsResponseData).data.map(entry => entry.title)
      }
    }
    return rewards
  }

  // https://dev.twitch.tv/docs/api/reference#replace-stream-tags
  public async replaceStreamTags(
    accessToken: string,
    tagIds: string[],
    bot: Bot,
    user: User,
  ): Promise<Response | null> {
    const url = apiUrl('/streams/tags') + asQueryArgs({ broadcaster_id: user.twitch_id })
    const req = async (token: string): Promise<Response> => {
      return await xhr.put(url, withHeaders(this._authHeaders(token), asJson({ tag_ids: tagIds })))
    }
    return await this.executeRequestWithRetry(accessToken, req, bot, user, url)
  }

  public async validateOAuthToken(
    broadcasterId: string,
    accessToken: string,
  ): Promise<ValidateOAuthTokenResponse> {
    const url = apiUrl('/channels') + asQueryArgs({ broadcaster_id: broadcasterId })
    let json
    try {
      const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken)))
      const json = (await resp.json()) as TwitchHelixGetChannelInformationResponseData
      return { valid: json.data[0] ? true : false, data: json }
    } catch (e) {
      return { valid: false, data: json }
    }
  }


  // https://dev.twitch.tv/docs/api/reference#get-broadcaster-subscriptions
  public async isUserSubscriber(
    accessToken: string,
    broadcasterId: string,
    userId: string,
  ): Promise<boolean> {
    const url = apiUrl('/subscriptions') + asQueryArgs({ broadcaster_id: broadcasterId, user_id: userId })
    try {
      const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}))
      const json = await resp.json() as any
      return json.data.length > 0
    } catch (e) {
      log.error({ url, e, broadcasterId, userId })
      return false
    }
  }

  // https://dev.twitch.tv/docs/api/reference#get-vips
  public async isUserVip(
    accessToken: string,
    broadcasterId: string,
    userId: string,
  ): Promise<boolean> {
    const url = apiUrl('/channels/vips') + asQueryArgs({ broadcaster_id: broadcasterId, user_id: userId })
    try {
      const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}))
      const json = await resp.json() as any
      return json.data.length > 0
    } catch (e) {
      log.error({ url, e, broadcasterId, userId })
      return false
    }
  }

  // https://dev.twitch.tv/docs/api/reference#get-moderators
  public async isUserModerator(
    accessToken: string,
    broadcasterId: string,
    userId: string,
  ): Promise<boolean> {
    const url = apiUrl('/moderation/moderators') + asQueryArgs({ broadcaster_id: broadcasterId, user_id: userId })
    try {
      const resp = await xhr.get(url, withHeaders(this._authHeaders(accessToken), {}))
      const json = await resp.json() as any
      return json.data.length > 0
    } catch (e) {
      log.error({ url, e, broadcasterId, userId })
      return false
    }
  }

  private async executeRequestWithRetry(
    accessToken: string,
    req: (accessToken: string) => Promise<Response>,
    bot: Bot,
    user: User,
    url: string,
  ): Promise<Response | null> {
    if (!user.twitch_id) {
      return null
    }

    try {
      const resp = await req(accessToken)
      if (resp.status !== 401) {
        return resp
      }

      // try to refresh the token, if possible
      const result = await this.tryRefreshAccessToken(accessToken, bot, user.id, user.twitch_id)
      if ('error' in result) {
        log.error(`unable to refresh token: ${result.error}`)
        return null
      }

      log.warn('retrying with refreshed token')
      return await req(result.token)
    } catch (e) {
      log.error({ url, e })
      return null
    }
  }

  public async tryRefreshAccessToken(
    accessToken: string,
    bot: Bot,
    userId: UserId,
    channelId: string,
  ): Promise<{ token: string } | { error: string }> {
    // try to refresh the token, if possible
    const row = await bot.getRepos().oauthToken.getByAccessToken(accessToken)
    if (!row || !row.refresh_token) {
      // we have no information about that token
      // or at least no way to refresh it
      return { error: 'no_refresh_token_found' }
    }

    const refreshResp = await this.refreshAccessToken(row.refresh_token)
    if (!refreshResp) {
      return { error: 'refresh_oauth_token_failed' }
    }

    await bot.getRepos().oauthToken.insert({
      user_id: userId,
      channel_id: channelId,
      access_token: refreshResp.access_token,
      refresh_token: refreshResp.refresh_token,
      scope: refreshResp.scope.join(','),
      token_type: refreshResp.token_type,
      expires_at: toJSONDateString(new Date(Date.now() + refreshResp.expires_in * 1000)),
    })
    log.info('__tryRefreshAccessToken - refreshed an access token')
    return { token: refreshResp.access_token }
  }
}
