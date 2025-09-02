import type { TwitchBotIdentity } from '../types'
import type { TwitchChatClient } from './twitch'
import { createTwitchChatClient } from './twitch'

export class TwitchChatClientManager {
  constructor () {
    // pass
  }

  get (identity: TwitchBotIdentity, channel: string): TwitchChatClient {
    const client: TwitchChatClient = createTwitchChatClient({
      clientId: identity.client_id,
      password: identity.password,
      channel,
    })
    return client
  }
}
