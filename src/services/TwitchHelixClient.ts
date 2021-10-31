import { RequestInit } from 'node-fetch'
import { logger } from '../fn'
import { postJson, getJson, asJson, withHeaders, asQueryArgs, requestText } from '../net/xhr'

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
}

interface TwitchHelixUserSearchResponseData {
  data: TwitchHelixUserSearchResponseDataEntry[]
}

class TwitchHelixClient {
  private clientId: string
  private clientSecret: string

  constructor(
    clientId: string,
    clientSecret: string,
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  async withAuthHeaders(opts = {}): Promise<RequestInit> {
    const accessToken = await this.getAccessToken()
    return withHeaders({
      'Client-ID': this.clientId,
      'Authorization': `Bearer ${accessToken}`,
    }, opts)
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

  async getUserIdByName(userName: string): Promise<string> {
    const url = `${API_BASE}/users${asQueryArgs({ login: userName })}`
    const json = await getJson(url, await this.withAuthHeaders()) as TwitchHelixUserSearchResponseData
    try {
      return json.data[0].id
    } catch (e) {
      log.error(json)
      return ''
    }
  }

  async getStreams(userId: string) {
    const url = `${API_BASE}/streams${asQueryArgs({ user_id: userId })}`
    return await getJson(url, await this.withAuthHeaders())
  }

  async getSubscriptions() {
    const url = `${API_BASE}/eventsub/subscriptions`
    return await getJson(url, await this.withAuthHeaders())
  }

  async deleteSubscription(id: string) {
    const url = `${API_BASE}/eventsub/subscriptions${asQueryArgs({ id: id })}`
    return await requestText('delete', url, await this.withAuthHeaders())
  }

  async createSubscription(subscription: TwitchHelixSubscription) {
    const url = `${API_BASE}/eventsub/subscriptions`
    return await postJson(url, await this.withAuthHeaders(asJson(subscription)))
  }
}

export default TwitchHelixClient
