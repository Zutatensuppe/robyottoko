import { logger } from '../fn.ts'
import { postJson, getJson, asJson, withHeaders, asQueryArgs, requestText } from '../net/xhr.ts'

const log = logger('TwitchHelixClient.js')

class TwitchHelixClient {
  constructor(
    /** @type string */ clientId,
    /** @type string */ clientSecret
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.helixApiBase = 'https://api.twitch.tv/helix'
  }

  async withAuthHeaders(opts = {}) {
    const accessToken = await this.getAccessToken()
    return withHeaders({
      'Client-ID': this.clientId,
      'Authorization': `Bearer ${accessToken}`,
    }, opts)
  }

  // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
  async getAccessToken(scopes = []) {
    const url = `https://id.twitch.tv/oauth2/token` + asQueryArgs({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
      scope: scopes.join(' '),
    })
    const json = await postJson(url)
    return json.access_token
  }

  async getUserIdByName(userName) {
    const url = `${this.helixApiBase}/users${asQueryArgs({ login: userName })}`
    const json = await getJson(url, await this.withAuthHeaders())
    try {
      return json.data[0].id
    } catch (e) {
      log.error(json)
      return ''
    }
  }

  async getStreams(userId) {
    const url = `${this.helixApiBase}/streams${asQueryArgs({ user_id: userId })}`
    return await getJson(url, await this.withAuthHeaders())
  }

  async getSubscriptions() {
    const url = `${this.helixApiBase}/eventsub/subscriptions`
    return await getJson(url, await this.withAuthHeaders())
  }

  async deleteSubscription(id) {
    const url = `${this.helixApiBase}/eventsub/subscriptions${asQueryArgs({ id: id })}`
    return await requestText('delete', url, await this.withAuthHeaders())
  }

  async createSubscription(subscription) {
    const url = `${this.helixApiBase}/eventsub/subscriptions`
    return await postJson(url, await this.withAuthHeaders(asJson(subscription)))
  }
}

export default TwitchHelixClient
