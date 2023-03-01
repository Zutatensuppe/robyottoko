import TwitchHelixClient from './TwitchHelixClient'
import { logger, Logger } from '../common/fn'
import { User } from '../repo/Users'
import { Bot, EventSubTransport, TwitchBotIdentity, TwitchChatClient, TwitchChatContext, TwitchConfig } from '../types'
import { ALL_SUBSCRIPTIONS_TYPES, SubscriptionType } from './twitch/EventSub'
import { ChatEventHandler } from './twitch/ChatEventHandler'
import { Timer } from '../Timer'
import { normalizeChatMessage } from '../fn'

const log = logger('TwitchClientManager.ts')

const isDevTunnel = (url: string) => url.match(/^https:\/\/[a-z0-9-]+\.(?:loca\.lt|ngrok\.io)\//)

const isRelevantSubscription = (
  configuredTransport: EventSubTransport,
  subscription: any,
  twitchChannelIds: string[],
) => {
  return configuredTransport.method === subscription.transport.method
    && (
      configuredTransport.callback === subscription.transport.callback
      || (isDevTunnel(configuredTransport.callback) && isDevTunnel(subscription.transport.callback))
    )
    && (
      // normal subscription
      (subscription.type !== 'channel.raid' && twitchChannelIds.includes(subscription.condition.broadcaster_user_id))

      // raid subscription
      || (subscription.type === 'channel.raid' && twitchChannelIds.includes(subscription.condition.to_broadcaster_user_id))
    )
}

const determineIdentity = (user: User, cfg: TwitchConfig): TwitchBotIdentity => {
  return (
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
}

const chatEventHandler = new ChatEventHandler()

class TwitchClientManager {
  private chatClient: TwitchChatClient | null = null
  private helixClient: TwitchHelixClient | null = null

  private log: Logger

  constructor(
    private readonly bot: Bot,
    private user: User,
  ) {
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
    const timer = new Timer()
    timer.reset()

    let connectReason = reason
    const cfg = this.bot.getConfig().twitch
    const user = this.user

    this.log = logger('TwitchClientManager.ts', `${user.name}|`)

    await this._disconnectChatClient()

    timer.split()
    this.log.debug(`disconnecting chat client took ${timer.lastSplitMs()}ms`)

    const identity = determineIdentity(user, cfg)

    if (user.twitch_id && user.twitch_login && user.bot_enabled) {
      this.log.info('* twitch bot enabled')

      // connect to chat via tmi (to all channels configured)
      this.chatClient = this.bot.getTwitchTmiClientManager().get(identity, [user.twitch_login])

      const reportStatusToChannel = (user: User, reason: string) => {
        if (!user.bot_status_messages) {
          return
        }
        const say = this.bot.sayFn(user, user.twitch_login)
        if (reason === 'init') {
          say('⚠️ Bot rebooted - please restart timers...')
        } else if (reason === 'access_token_refreshed') {
          // dont say anything
        } else if (reason === 'user_change') {
          say('✅ User settings updated...')
        } else {
          say('✅ Reconnected...')
        }
      }

      if (this.chatClient) {
        this.chatClient.on('message', async (
          target: string,
          context: TwitchChatContext,
          msg: string,
          self: boolean,
        ) => {
          if (self) { return } // Ignore messages from the bot

          // sometimes chat contains imprintable characters
          // they are removed here
          const msgOriginal = msg
          const msgNormalized = normalizeChatMessage(msg)
          await (chatEventHandler).handle(
            this.bot,
            this.user,
            target,
            context,
            msgOriginal,
            msgNormalized,
          )
        })

        // Called every time the bot connects to Twitch chat
        this.chatClient.on('connected', async (addr: string, port: number) => {
          this.log.info({ addr, port }, 'Connected')

          // if status reporting is disabled, dont print messages
          if (this.bot.getConfig().bot.reportStatus) {
            reportStatusToChannel(this.user, connectReason)
          }

          // set connectReason to empty, everything from now is just a reconnect
          // due to disconnect from twitch
          connectReason = ''
        })

        // do NOT await
        // awaiting the connect will add ~1sec per user on server startup
        this.chatClient.connect().catch((e) => {
          // this can happen when calling close before the connection
          // could be established
          this.log.error({ e }, 'error when connecting')
        })
      }

      timer.split()
      this.log.debug(`connecting chat client took ${timer.lastSplitMs()}ms`)
    }

    // register EventSub
    // @see https://dev.twitch.tv/docs/eventsub
    this.helixClient = new TwitchHelixClient(
      identity.client_id,
      identity.client_secret,
    )

    if (this.bot.getConfig().twitch.eventSub.enabled) {
      // do NOT await
      // awaiting the connect will add ~2sec per user on server startup
      this.registerSubscriptions(this.user)
    }

    timer.split()
    this.log.debug(`registering subscriptions took ${timer.lastSplitMs()}ms`)
  }

  async registerSubscriptions(user: User) {
    if (!this.helixClient) {
      this.log.error('registerSubscriptions: helixClient not initialized')
      return
    }
    if (!user.twitch_login || !user.twitch_id) {
      this.log.error('registerSubscriptions: user twitch information not set')
      return
    }
    const twitchChannelId = user.twitch_id
    const transport = this.bot.getConfig().twitch.eventSub.transport
    this.log.debug(`registering subscriptions for ${user.twitch_login} channels`)

    // TODO: maybe get all subscriptions from database to not
    //       do the one 'getSubscriptions' request. depending on how long that
    //       one needs

    const allSubscriptions: any = await this.helixClient.getSubscriptions()

    // map that holds status for each subscription type
    // (true if callback is already registered, false if not)
    // @ts-ignore (map filled in for loop)
    const existsMap: Record<SubscriptionType, Record<string, boolean>> = {}

    for (const subscriptionType of ALL_SUBSCRIPTIONS_TYPES) {
      existsMap[subscriptionType] = {}
      existsMap[subscriptionType][twitchChannelId] = false
    }

    const deletePromises: Promise<void>[] = []
    if (isDevTunnel(transport.callback)) {
      for (const subscription of allSubscriptions.data) {
        if (!isRelevantSubscription(transport, subscription, [twitchChannelId])) {
          continue
        }

        // on dev, we still want to delete all subscriptions because
        // new ngrok urls will be created
        deletePromises.push(this.deleteSubscription(subscription))
      }
    } else {
      // delete all subscriptions (but keep at least one of each type)
      const deletePromises: Promise<void>[] = []
      for (const subscription of allSubscriptions.data) {
        if (!isRelevantSubscription(transport, subscription, [twitchChannelId])) {
          continue
        }

        // not dev
        if (existsMap[subscription.type as SubscriptionType][twitchChannelId]) {
          deletePromises.push(this.deleteSubscription(subscription))
        } else {
          existsMap[subscription.type as SubscriptionType][twitchChannelId] = true

          await this.bot.getRepos().eventSub.insert({
            user_id: this.user.id,
            subscription_id: subscription.id,
            subscription_type: subscription.type,
          })
        }
      }
    }
    await Promise.all(deletePromises)
    this.log.debug(`deleted ${deletePromises.length} subscriptions`)

    const createPromises: Promise<void>[] = []
    // create all subscriptions
    for (const subscriptionType of ALL_SUBSCRIPTIONS_TYPES) {
      if (!existsMap[subscriptionType][user.twitch_id]) {
        createPromises.push(this.registerSubscription(subscriptionType, user))
      }
    }
    await Promise.all(createPromises)
    this.log.debug(`registered ${createPromises.length} subscriptions`)
  }

  async deleteSubscription(
    subscription: any,
  ): Promise<void> {
    if (!this.helixClient) {
      return
    }
    await this.helixClient.deleteSubscription(subscription.id)
    await this.bot.getRepos().eventSub.delete({
      user_id: this.user.id,
      subscription_id: subscription.id,
    })
    this.log.info({ type: subscription.type }, 'subscription deleted')
  }

  async registerSubscription(
    subscriptionType: SubscriptionType,
    user: User,
  ): Promise<void> {
    if (!this.helixClient) {
      return
    }
    if (!user.twitch_id) {
      return
    }

    const condition = subscriptionType === SubscriptionType.ChannelRaid
      ? { to_broadcaster_user_id: `${user.twitch_id}` }
      : { broadcaster_user_id: `${user.twitch_id}` }
    const subscription = {
      type: subscriptionType,
      version: '1',
      transport: this.bot.getConfig().twitch.eventSub.transport,
      condition,
    }
    const resp = await this.helixClient.createSubscription(subscription)
    if (resp && resp.data && resp.data.length > 0) {
      await this.bot.getRepos().eventSub.insert({
        user_id: this.user.id,
        subscription_id: resp.data[0].id,
        subscription_type: subscriptionType,
      })
      this.log.info({ type: subscriptionType }, 'subscription registered')
    } else {
      this.log.debug({ resp, subscription })
    }
  }

  async _disconnectChatClient() {
    if (this.chatClient) {
      this.chatClient.removeAllListeners('message')
      try {
        await this.chatClient.disconnect()
      } catch (e) {
        this.log.info({ e })
      } finally {
        this.chatClient = null
      }
    }
  }

  getChatClient() {
    return this.chatClient
  }

  getHelixClient() {
    return this.helixClient
  }
}

export default TwitchClientManager
