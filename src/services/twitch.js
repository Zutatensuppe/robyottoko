const fetch = require('node-fetch')

class HelixClient {
  constructor(clientId, clientSecret) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
  async getAccessToken (scopes=[]) {
    const url = `https://id.twitch.tv/oauth2/token`
      + `?client_id=${this.clientId}`
      + `&client_secret=${this.clientSecret}`
      + `&grant_type=client_credentials`
      + `&scope=${scopes.join(',')}`
    const res = await fetch(url, { method: 'post' })
    const json = await res.json()
    const accessToken = json.access_token
    return accessToken
  }

  async getUserIdByName (userName) {
    const accessToken = await this.getAccessToken()
    const url = `https://api.twitch.tv/helix/users?login=${userName}`
    const res = await fetch(url, {
      method: 'get',
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    const json = await res.json()
    return json.data[0].id
  }

  async getSubscriptions () {
    const url = `https://api.twitch.tv/helix/eventsub/subscriptions`
    const accessToken = await this.getAccessToken()
    const res = await fetch(url, {
      method: 'get',
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    const json = await res.json()
    return json
  }

  async deleteSubscription (id) {
    const url = `https://api.twitch.tv/helix/eventsub/subscriptions`
      + `?id=${id}`
    const accessToken = await this.getAccessToken()
    const res = await fetch(url, {
      method: 'delete',
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    const json = await res.json()
    return json
  }

  async createSubscription (subscription) {
    const url = `https://api.twitch.tv/helix/eventsub/subscriptions`
    const accessToken = await this.getAccessToken()
    const res = await fetch(url, {
      method: 'post',
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription)
    })
    const json = await res.json()
    return json
  }
}

module.exports = {
  HelixClient,
}
