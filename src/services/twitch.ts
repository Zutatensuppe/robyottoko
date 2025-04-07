import type { ChatUserstate, Client } from 'tmi.js'
import { client } from 'tmi.js'

interface TwitchEventContext extends ChatUserstate {
  extra?: {
    bits?: {
      amount: number
    }
    giftsubs?: {
      amount: number
    }
    raiders?: {
      amount: number
    }
  }
}

export {
  ChatUserstate as TwitchContext,
  TwitchEventContext,
  Client as TwitchClient,
  client as createTwitchClient,
}
