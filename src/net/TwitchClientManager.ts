// @ts-ignore
import tmi from 'tmi.js'
import TwitchHelixClient from '../services/TwitchHelixClient'
import fn from '../fn'
import { logger, Logger } from '../common/fn'
import { TwitchChannel } from '../services/TwitchChannels'
import { User } from '../services/Users'
import { Bot, EventSubTransport, TwitchChatClient, TwitchChatContext } from '../types'
import { ALL_SUBSCRIPTIONS_TYPES } from '../services/twitch/EventSub'
import { ChatEventHandler } from '../services/twitch/ChatEventHandler'

const log = logger('TwitchClientManager.ts')

interface Identity {
  username: string
  password: string
  client_id: string
  client_secret: string
}

const isDevTunnel = (url: string) => url.match(/^https:\/\/[a-z0-9-]+\.(?:loca\.lt|ngrok\.io)\//)

const shouldDeleteSubscription = (
  transport: EventSubTransport,
  subscription: any,
  twitchChannelIds: string[]
) => {
  return transport.method === subscription.transport.method
    && (
      transport.callback === subscription.transport.callback
      || (isDevTunnel(transport.callback) && isDevTunnel(subscription.transport.callback))
    )
    && twitchChannelIds.includes(subscription.condition.broadcaster_user_id)
}

class TwitchClientManager {
  private bot: Bot
  private user: User

  private chatClient: TwitchChatClient | null = null
  private helixClient: TwitchHelixClient | null = null
  private identity: Identity | null = null

  private log: Logger

  constructor(
    bot: Bot,
    user: User,
  ) {
    this.bot = bot
    this.user = user
    this.log = logger('TwitchClientManager.ts', `${user.name}|`)
  }

  async accessTokenRefreshed(user: User) {
    this.user = user
    await this.init('access_token_refreshed')
  }

  async userChanged(user: User) {
    this.user = user
    await this.init('user_change')
  }

  async init(reason: string) {
    let connectReason = reason
    const cfg = this.bot.getConfig().twitch
    const user = this.user

    this.log = logger('TwitchClientManager.ts', `${user.name}|`)

    await this._disconnectChatClient()

    const twitchChannels = await this.bot.getTwitchChannels().allByUserId(user.id)
    if (twitchChannels.length === 0) {
      this.log.info(`* No twitch channels configured at all`)
      return
    }

    const identity = (
      user.tmi_identity_username
      && user.tmi_identity_password
      && user.tmi_identity_client_id
    ) ? {
      username: user.tmi_identity_username,
      password: user.tmi_identity_password,
      client_id: user.tmi_identity_client_id,
      client_secret: user.tmi_identity_client_secret,
    } : {
      username: cfg.tmi.identity.username,
      password: cfg.tmi.identity.password,
      client_id: cfg.tmi.identity.client_id,
      client_secret: cfg.tmi.identity.client_secret,
    }
    this.identity = identity

    // connect to chat via tmi (to all channels configured)
    const chatClient = new tmi.client({
      identity: {
        username: identity.username,
        password: identity.password,
        client_id: identity.client_id,
      },
      channels: twitchChannels.map(ch => ch.channel_name),
      connection: {
        reconnect: true,
      }
    })
    this.chatClient = chatClient

    chatClient.on('message', async (target: string, context: TwitchChatContext, msg: string, self: boolean) => {
      if (self) { return; } // Ignore messages from the bot

      await (new ChatEventHandler()).handle(this.bot, this.user, target, context, msg)
    })

    // Called every time the bot connects to Twitch chat
    chatClient.on('connected', (addr: string, port: number) => {
      this.log.info(`* Connected to ${addr}:${port}`)
      for (const channel of twitchChannels) {
        if (!channel.bot_status_messages) {
          continue;
        }
        // note: this can lead to multiple messages if multiple users
        //       have the same channels set up
        const say = fn.sayFn(chatClient, channel.channel_name)
        if (connectReason === 'init') {
          say('⚠️ Bot rebooted - please restart timers...')
        } else if (connectReason === 'access_token_refreshed') {
          // dont say anything
        } else if (connectReason === 'user_change') {
          say('✅ User settings updated...')
        } else {
          say('✅ Reconnected...')
        }
      }

      // set connectReason to empty, everything from now is just a reconnect
      // due to disconnect from twitch
      connectReason = ''
    })

    // register EventSub
    // @see https://dev.twitch.tv/docs/eventsub
    const helixClient = new TwitchHelixClient(
      identity.client_id,
      identity.client_secret,
    )
    this.helixClient = helixClient

    if (this.chatClient) {
      try {
        await this.chatClient.connect()
      } catch (e) {
        // this can happen when calling close before the connection
        // could be established
        this.log.error('error when connecting', e)
      }
    }

    await this.registerSubscriptions(twitchChannels)
  }

  async registerSubscriptions(twitchChannels: TwitchChannel[]) {
    if (!this.helixClient) {
      this.log.error('registerSubscriptions: helixClient not initialized')
      return
    }
    const twitchChannelIds: string[] = twitchChannels.map(ch => `${ch.channel_id}`)
    const transport = this.bot.getConfig().twitch.eventSub.transport

    // delete all subscriptions
    const deletePromises: Promise<void>[] = []
    const allSubscriptions: any = await this.helixClient.getSubscriptions()
    for (const subscription of allSubscriptions.data) {
      if (shouldDeleteSubscription(transport, subscription, twitchChannelIds)) {
        deletePromises.push(this.deleteSubscription(subscription))
      }
    }
    await Promise.all(deletePromises)

    const createPromises: Promise<void>[] = []
    // create all subscriptions
    for (const twitchChannel of twitchChannels) {
      for (const subscriptionType of ALL_SUBSCRIPTIONS_TYPES) {
        createPromises.push(this.registerSubscription(subscriptionType, twitchChannel))
      }
    }
    await Promise.all(createPromises)
  }

  async deleteSubscription(
    subscription: any,
  ): Promise<void> {
    if (!this.helixClient) {
      return
    }
    await this.helixClient.deleteSubscription(subscription.id)
    await this.bot.getDb().delete('robyottoko.event_sub', {
      user_id: this.user.id,
      subscription_id: subscription.id,
    })
    this.log.info(`${subscription.type} subscription deleted`)
  }

  async registerSubscription(
    subscriptionType: string,
    twitchChannel: TwitchChannel,
  ): Promise<void> {
    if (!this.helixClient) {
      return
    }
    if (!twitchChannel.channel_id) {
      return
    }

    const subscription = {
      type: subscriptionType,
      version: '1',
      transport: this.bot.getConfig().twitch.eventSub.transport,
      condition: {
        broadcaster_user_id: `${twitchChannel.channel_id}`,
      },
    }
    const resp = await this.helixClient.createSubscription(subscription)
    if (resp && resp.data && resp.data.length > 0) {
      await this.bot.getDb().insert('robyottoko.event_sub', {
        user_id: this.user.id,
        subscription_id: resp.data[0].id,
      })
      this.log.info(`${subscriptionType} subscription registered`)
    }
    this.log.debug(resp)
  }

  async _disconnectChatClient() {
    if (this.chatClient) {
      try {
        await this.chatClient.disconnect()
        this.chatClient = null
      } catch (e) {
        this.log.info(e)
      }
    }
  }

  getChatClient() {
    return this.chatClient
  }

  getHelixClient() {
    return this.helixClient
  }

  getIdentity() {
    return this.identity
  }
}

export default TwitchClientManager
