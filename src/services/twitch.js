const { postJson, getJson, delJson, asJson, withHeaders, asQueryArgs } = require('../net/xhr.js')

class HelixClient {
  constructor(clientId, clientSecret) {
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
  async getAccessToken (scopes=[]) {
    const url = `https://id.twitch.tv/oauth2/token` + asQueryArgs({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
      scope: scopes.join(' '),
    })
    const json = await postJson(url)
    return json.access_token
  }

  async getUserIdByName (userName) {
    const url = `${this.helixApiBase}/users${asQueryArgs({login: userName})}`
    const json = await getJson(url, await this.withAuthHeaders())
    return json.data[0].id
  }

  async getSubscriptions () {
    const url = `${this.helixApiBase}/eventsub/subscriptions`
    return await getJson(url, await this.withAuthHeaders())
  }

  async deleteSubscription (id) {
    const url = `${this.helixApiBase}/eventsub/subscriptions${asQueryArgs({id: id})}`
    return await delJson(url, await this.withAuthHeaders())
  }

  async createSubscription (subscription) {
    const url = `${this.helixApiBase}/eventsub/subscriptions`
    return await postJson(url, await this.withAuthHeaders(asJson(subscription)))
  }
}

module.exports = {
  HelixClient,
}
