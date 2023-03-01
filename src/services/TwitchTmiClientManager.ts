// @ts-ignore
import tmi from 'tmi.js'
import { TwitchBotIdentity, TwitchChatClient } from '../types'

export class TwitchTmiClientManager {
  constructor () {
    // pass
  }

  get (identity: TwitchBotIdentity, channels: string[]): TwitchChatClient {
    const client: TwitchChatClient = new tmi.client({
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
