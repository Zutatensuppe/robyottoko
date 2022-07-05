// @ts-ignore
import tmi from 'tmi.js'
import TwitchHelixClient from '../services/TwitchHelixClient'
import fn from '../fn'
import { logger, Logger, MINUTE } from '../common/fn'
import { TwitchChannel, TwitchChannelWithAccessToken } from '../services/TwitchChannels'
import { User } from '../services/Users'
import { Bot, CommandTriggerType, RawCommand, RewardRedemptionContext, TwitchChannelPointsEventMessage, TwitchChatClient, TwitchChatContext } from '../types'
import TwitchPubSubClient from '../services/TwitchPubSubClient'
import { getUniqueCommandsByTriggers, newBitsTrigger, newFollowTrigger, newRewardRedemptionTrigger, newSubscribeTrigger } from '../common/commands'
import { isBroadcaster, isMod, isSubscriber } from '../common/permissions'
import { WhereRaw } from '../DbPostgres'

const log = logger('TwitchClientManager.ts')

interface Identity {
  username: string
  password: string
  client_id: string
  client_secret: string
}

class TwitchClientManager {
  private bot: Bot
  private user: User

  private chatClient: TwitchChatClient | null = null
  private helixClient: TwitchHelixClient | null = null
  private identity: Identity | null = null
  private pubSubClient: TwitchPubSubClient | null = null

  // this should probably be handled in the pub sub client code?
  // channel_id => [] list of auth tokens that are bad
  private badAuthTokens: Record<string, string[]> = {}

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

  _resetBadAuthTokens() {
    this.badAuthTokens = {}
  }

  _addBadAuthToken(channelIds: string[], authToken: string) {
    for (const channelId of channelIds) {
      if (!this.badAuthTokens[channelId]) {
        this.badAuthTokens[channelId] = []
      }
      if (!this.badAuthTokens[channelId].includes(authToken)) {
        this.badAuthTokens[channelId].push(authToken)
      }
    }
  }

  _isBadAuthToken(channelId: string, authToken: string): boolean {
    return !!(
      this.badAuthTokens[channelId]
      && this.badAuthTokens[channelId].includes(authToken)
    )
  }

  determineRelevantPubSubChannels(twitchChannels: TwitchChannel[]): TwitchChannelWithAccessToken[] {
    return twitchChannels.filter(channel => {
      return !!(channel.access_token && channel.channel_id)
        && !this._isBadAuthToken(channel.channel_id, channel.access_token)
    }) as TwitchChannelWithAccessToken[]
  }

  async init(reason: string) {
    let connectReason = reason
    const cfg = this.bot.getConfig().twitch
    const user = this.user

    this.log = logger('TwitchClientManager.ts', `${user.name}|`)

    await this._disconnectChatClient()
    this._disconnectPubSubClient()

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

      // log.debug(context)
      const roles = []
      if (isMod(context)) {
        roles.push('M')
      }
      if (isSubscriber(context)) {
        roles.push('S')
      }
      if (isBroadcaster(context)) {
        roles.push('B')
      }
      this.log.debug(`${context.username}[${roles.join('')}]@${target}: ${msg}`)

      await this.bot.getDb().insert('robyottoko.chat_log', {
        created_at: new Date(),
        broadcaster_user_id: context['room-id'],
        user_name: context.username,
        display_name: context['display-name'],
        message: msg,
      })

      const countChatMessages = async (where: WhereRaw): Promise<number> => {
        const db = this.bot.getDb()
        const whereObject = db._buildWhere(where)
        const row = await db._get(
          `select COUNT(*) as c from robyottoko.chat_log ${whereObject.sql}`,
          whereObject.values
        )
        return parseInt(`${row.c}`, 10)
      }
      let _isFirstChatAlltime: null | boolean = null
      let _isFirstChatStream: null | boolean = null
      const isFirstChatAlltime = async () => {
        if (_isFirstChatAlltime === null) {
          _isFirstChatAlltime = await countChatMessages({
            broadcaster_user_id: context['room-id'],
            user_name: context.username,
          }) === 1
        }
        return _isFirstChatAlltime
      }
      const isFirstChatStream = async () => {
        if (_isFirstChatStream === null) {
          const stream = await helixClient.getStreamByUserId(context['room-id'])
          if (!stream) {
            const fakeStartDate = new Date(new Date().getTime() - (5 * MINUTE))
            log.info(`No stream is running atm for channel ${context['room-id']}. Using fake start date ${fakeStartDate}.`)
            _isFirstChatStream = await countChatMessages({
              broadcaster_user_id: context['room-id'],
              created_at: { '$gte': fakeStartDate },
              user_name: context.username,
            }) === 1
          } else {
            _isFirstChatStream = await countChatMessages({
              broadcaster_user_id: context['room-id'],
              created_at: { '$gte': new Date(stream.started_at) },
              user_name: context.username,
            }) === 1
          }
        }
        return _isFirstChatStream
      }
      const chatMessageContext = { client: chatClient, target, context, msg }

      for (const m of this.bot.getModuleManager().all(user.id)) {
        const commands = m.getCommands() || []
        let triggers = []
        const relevantTriggers = []
        for (const command of commands) {
          for (const trigger of command.triggers) {
            if (trigger.type === CommandTriggerType.COMMAND) {
              triggers.push(trigger)
            } else if (trigger.type === CommandTriggerType.FIRST_CHAT) {
              if (trigger.data.since === 'alltime' && await isFirstChatAlltime()) {
                relevantTriggers.push(trigger)
              } else if (trigger.data.since === 'stream' && await isFirstChatStream()) {
                relevantTriggers.push(trigger)
              }
            }
          }
        }

        // make sure longest commands are found first
        // so that in case commands `!draw` and `!draw bad` are set up
        // and `!draw bad` is written in chat, that command only will be
        // executed and not also `!draw`
        triggers = triggers.sort((a, b) => b.data.command.length - a.data.command.length)
        let rawCmd = null
        for (const trigger of triggers) {
          rawCmd = fn.parseCommandFromTriggerAndMessage(chatMessageContext.msg, trigger)
          if (!rawCmd) {
            continue
          }
          relevantTriggers.push(trigger)
          break
        }

        if (relevantTriggers.length > 0) {
          const cmdDefs = getUniqueCommandsByTriggers(commands, relevantTriggers)
          await fn.tryExecuteCommand(m, rawCmd, cmdDefs, target, context)
        }
        await m.onChatMsg(chatMessageContext);
      }
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

    // connect to PubSub websocket only when required
    // https://dev.twitch.tv/docs/pubsub#topics
    this.log.info(`Initializing PubSub`)
    const pubsubChannels = this.determineRelevantPubSubChannels(twitchChannels)
    if (pubsubChannels.length === 0) {
      this.log.info(`* No twitch channels configured with access_token and channel_id set`)
    } else {
      this.pubSubClient = new TwitchPubSubClient()
      this.pubSubClient.on('open', async () => {
        if (!this.pubSubClient) {
          return
        }

        // listen for evts
        const pubsubChannels = this.determineRelevantPubSubChannels(twitchChannels)
        if (pubsubChannels.length === 0) {
          this.log.info(`* No twitch channels configured with a valid access_token`)
          this._disconnectPubSubClient()
          return
        }

        for (const channel of pubsubChannels) {
          this.log.info(`${channel.channel_name} listen for channel point redemptions`)
          this.pubSubClient.listen(
            `channel-points-channel-v1.${channel.channel_id}`,
            channel.access_token
          )
        }

        // TODO: change any type
        this.pubSubClient.on('message', async (message: any) => {
          if (message.type === 'RESPONSE' && message.error === 'ERR_BADAUTH' && message.sentData) {
            const channelIds = message.sentData.data.topics.map((t: string) => t.split('.')[1])
            const authToken = message.sentData.data.auth_token
            this._addBadAuthToken(channelIds, authToken)

            // now check if there are still any valid twitch channels, if not
            // then disconnect, because we dont need the pubsub to be active
            const pubsubChannels = this.determineRelevantPubSubChannels(twitchChannels)
            if (pubsubChannels.length === 0) {
              this.log.info(`* No twitch channels configured with a valid access_token`)
              this._disconnectPubSubClient()
              return
            }
          }
          if (message.type !== 'MESSAGE') {
            return
          }
          const messageData: any = JSON.parse(message.data.message)
          // channel points redeemed with non standard reward
          // standard rewards are not supported :/
          if (messageData.type === 'reward-redeemed') {
            await this.handleRewardRedeemMessage(messageData)
          } else {
            this.log.debug('MESSAGE received', messageData)
          }
        })
      })
    }

    if (this.chatClient) {
      try {
        await this.chatClient.connect()
      } catch (e) {
        // this can happen when calling close before the connection
        // could be established
        this.log.error('error when connecting', e)
      }
    }
    if (this.pubSubClient) {
      this.pubSubClient.connect()
    }

    await this.registerSubscriptions(twitchChannels)
  }

  async registerSubscriptions(twitchChannels: TwitchChannel[]) {
    if (!this.helixClient) {
      this.log.error('registerSubscriptions: helixClient not initialized')
      return
    }
    const twitchChannelIds: string[] = twitchChannels.map(ch => `${ch.channel_id}`)

    // delete all subscriptions
    const allSubscriptions: any = await this.helixClient.getSubscriptions()
    for (const s of allSubscriptions.data) {
      if (twitchChannelIds.includes(s.condition.broadcaster_user_id)) {
        await this.helixClient.deleteSubscription(s.id)
        await this.bot.getDb().delete('robyottoko.event_sub', {
          user_id: this.user.id,
          subscription_id: s.id,
        })
        this.log.info(`${s.type} subscription deleted`)
      }
    }

    // create all subscriptions
    const botCfg = this.bot.getConfig()
    for (const twitchChannel of twitchChannels) {
      if (!twitchChannel.channel_id) {
        continue
      }
      const subscriptionTypes = [
        'channel.follow',
        'channel.cheer',
        'channel.subscribe',
      ]
      for (const subscriptionType of subscriptionTypes) {
        const subscription = {
          type: subscriptionType,
          version: '1',
          transport: botCfg.twitch.eventSub.transport,
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
    }
  }

  // TODO: use better type info
  async handleSubscribeEvent(data: { subscription: any, event: any }) {
    this.log.info('handleSubscribeEvent')
    const rawCmd: RawCommand = {
      name: 'channel.subscribe',
      args: [],
    }
    const target = data.event.broadcaster_user_name
    const context: TwitchChatContext = {
      "room-id": data.event.broadcaster_user_id,
      "user-id": data.event.user_id,
      "display-name": data.event.user_name,
      username: data.event.user_login,
      mod: false, // no way to tell without further looking up user somehow
      subscriber: true, // user just subscribed, so it is a subscriber
    }

    const promises: Promise<void>[] = []
    for (const m of this.bot.getModuleManager().all(this.user.id)) {
      const trigger = newSubscribeTrigger()
      const commands = m.getCommands()
      const cmdDefs = getUniqueCommandsByTriggers(commands, [trigger])
      this.log.info('cmdDefs:', cmdDefs.length)
      promises.push(fn.tryExecuteCommand(m, rawCmd, cmdDefs, target, context))
    }
    await Promise.all(promises)
  }

  // TODO: use better type info
  async handleFollowEvent(data: { subscription: any, event: any }) {
    this.log.info('handleFollowEvent')
    const rawCmd: RawCommand = {
      name: 'channel.follow',
      args: [],
    }
    const target = data.event.broadcaster_user_name
    const context: TwitchChatContext = {
      "room-id": data.event.broadcaster_user_id,
      "user-id": data.event.user_id,
      "display-name": data.event.user_name,
      username: data.event.user_login,
      mod: false, // no way to tell without further looking up user somehow
      subscriber: false, // unknown
    }

    const promises: Promise<void>[] = []
    for (const m of this.bot.getModuleManager().all(this.user.id)) {
      const trigger = newFollowTrigger()
      const commands = m.getCommands()
      const cmdDefs = getUniqueCommandsByTriggers(commands, [trigger])
      this.log.info('cmdDefs:', cmdDefs.length)
      promises.push(fn.tryExecuteCommand(m, rawCmd, cmdDefs, target, context))
    }
    await Promise.all(promises)
  }

  // TODO: use better type info
  async handleCheerEvent(data: { subscription: any, event: any }) {
    this.log.info('handleCheerEvent')
    const rawCmd: RawCommand = {
      name: 'channel.cheer',
      args: [],
    }
    const target = data.event.broadcaster_user_name
    const context: TwitchChatContext = {
      "room-id": data.event.broadcaster_user_id,
      "user-id": data.event.user_id,
      "display-name": data.event.user_name,
      username: data.event.user_login,
      mod: false, // no way to tell without further looking up user somehow
      subscriber: false, // unknown
    }

    const promises: Promise<void>[] = []
    for (const m of this.bot.getModuleManager().all(this.user.id)) {
      const trigger = newBitsTrigger()
      const commands = m.getCommands()
      const cmdDefs = getUniqueCommandsByTriggers(commands, [trigger])
      this.log.info('cmdDefs:', cmdDefs.length)
      promises.push(fn.tryExecuteCommand(m, rawCmd, cmdDefs, target, context))
    }
    await Promise.all(promises)
  }

  async handleRewardRedeemMessage(messageData: any) {
    if (!this.chatClient) {
      return
    }

    const redemptionMessage: TwitchChannelPointsEventMessage = messageData
    this.log.debug(redemptionMessage.data.redemption)
    const redemption = redemptionMessage.data.redemption

    const twitchChannel = await this.bot.getDb().get('robyottoko.twitch_channel', { channel_id: redemption.channel_id })
    if (!twitchChannel) {
      return
    }

    const target = twitchChannel.channel_name
    const context: TwitchChatContext = {
      "room-id": redemption.channel_id,
      "user-id": redemption.user.id,
      "display-name": redemption.user.display_name,
      username: redemption.user.login,
      mod: false, // no way to tell without further looking up user somehow
      subscriber: redemption.reward.is_sub_only, // this does not really tell us if the user is sub or not, just if the redemption was sub only
    }
    const rewardRedemptionContext: RewardRedemptionContext = {
      client: this.chatClient,
      target,
      context,
      redemption,
    }

    const promises: Promise<void>[] = []
    for (const m of this.bot.getModuleManager().all(this.user.id)) {
      // reward redemption should all have exact key/name of the reward,
      // no sorting required
      const commands = m.getCommands()

      // make a tmp trigger to match commands against
      const trigger = newRewardRedemptionTrigger(redemption.reward.title)
      const rawCmd: RawCommand = {
        name: redemption.reward.title,
        args: redemption.user_input ? [redemption.user_input] : [],
      }
      const cmdDefs = getUniqueCommandsByTriggers(commands, [trigger])
      promises.push(fn.tryExecuteCommand(m, rawCmd, cmdDefs, target, context))
      promises.push(m.onRewardRedemption(rewardRedemptionContext))
    }
    await Promise.all(promises)
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

  _disconnectPubSubClient() {
    try {
      if (this.pubSubClient !== null) {
        this.pubSubClient.disconnect()
        this.pubSubClient = null
      }
    } catch (e) {
      this.log.info(e)
    }
    this._resetBadAuthTokens()
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
