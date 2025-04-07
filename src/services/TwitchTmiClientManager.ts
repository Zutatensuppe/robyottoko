import { TwitchBotIdentity } from '../types'
import { createTwitchClient, TwitchClient } from './twitch'

export class TwitchTmiClientManager {
  constructor () {
    // pass
  }

  get (identity: TwitchBotIdentity, channels: string[]): TwitchClient {
    const client: TwitchClient = new createTwitchClient({
      options: {
        clientId: identity.client_id,
      },
      identity: {
        username: identity.username,
        password: identity.password,
      },
      channels,
      connection: {
        reconnect: true,
      },
    })
    return client
  }
}
