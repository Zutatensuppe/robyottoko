import { StaticAuthProvider } from '@twurple/auth'
import type { ChatMessage } from '@twurple/chat'
import { ChatClient } from '@twurple/chat'

export type TwitchContext = {
  channelId: string | null
  emotes?: Map<string, string[]> | null
  isMod: boolean
  isSubscriber: boolean
  isVip: boolean
  userDisplayName: string
  userId: string
  userLoginName: string
}

export type TwitchEventContext = TwitchContext & {
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

export const createTwitchChatClient = (options: {
  clientId: string,
  password: string,
  channel: string,
}) => {
  const passwordWithoutOauth = options.password.replace(/^oauth:/, '')
  const authProvider = new StaticAuthProvider(
    options.clientId,
    passwordWithoutOauth,
  )
  return new ChatClient({
    authProvider,
    channels: [options.channel],
  })
}

export const contextFromChatMessage = (msg: ChatMessage): TwitchEventContext => {
  return {
    userDisplayName: msg.userInfo.displayName,
    channelId: msg.channelId,
    userId: msg.userInfo.userId,
    userLoginName: msg.userInfo.userName,
    isMod: msg.userInfo.isMod,
    isSubscriber: msg.userInfo.isSubscriber,
    isVip: msg.userInfo.isVip,
    emotes: msg.emoteOffsets,
  }
}

export {
  ChatClient as TwitchChatClient,
}
