// @ts-ignore
import tmi from 'tmi.js'
import TwitchHelixClient from '../services/TwitchHelixClient'
import fn from '../fn'
import { logger, Logger } from '../common/fn'
import TwitchChannels, { TwitchChannel, TwitchChannelWithAccessToken } from '../services/TwitchChannels'
import { User } from '../services/Users'
import { Bot, RawCommand, RewardRedemptionContext, TwitchChannelPointsEventMessage, TwitchChatClient, TwitchChatContext, TwitchConfig } from '../types'
import TwitchPubSubClient from '../services/TwitchPubSubClient'
import { getUniqueCommandsByTrigger, newRewardRedemptionTrigger } from '../common/commands'
import { isBroadcaster, isMod, isSubscriber } from '../common/permissions'

interface Identity {
  username: string
  password: string
  client_id: string
  client_secret: string
}

class TwitchClientManager {
  private bot: Bot
  private cfg: TwitchConfig
  private user: User
  private twitchChannelRepo: TwitchChannels

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
    cfg: TwitchConfig,
    twitchChannelRepo: TwitchChannels,
  ) {
    this.bot = bot
    this.user = user
    this.cfg = cfg
    this.log = logger('TwitchClientManager.ts', `${user.name}|`)
    this.twitchChannelRepo = twitchChannelRepo
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
    const cfg = this.cfg
    const user = this.user
    const twitchChannelRepo = this.twitchChannelRepo

    this.log = logger('TwitchClientManager.ts', `${user.name}|`)

    await this._disconnectChatClient()
    this._disconnectPubSubClient()

    const twitchChannels = twitchChannelRepo.allByUserId(user.id)
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
      this.log.info(`${context.username}[${roles.join('')}]@${target}: ${msg}`)

      this.bot.getDb().insert('chat_log', {
        created_at: `${new Date().toJSON()}`,
        broadcaster_user_id: context['room-id'],
        user_name: context.username,
        display_name: context['display-name'],
        message: msg,
      })
      const chatMessageContext = { client: chatClient, target, context, msg }

      for (const m of this.bot.getModuleManager().all(user.id)) {
        const commands = m.getCommands() || []
        let triggers = []
        for (const command of commands) {
          for (const trigger of command.triggers) {
            if (trigger.type === 'command') {
              triggers.push(trigger)
            }
          }
        }
        // make sure longest commands are found first
        // so that in case commands `!draw` and `!draw bad` are set up
        // and `!draw bad` is written in chat, that command only will be
        // executed and not also `!draw`
        triggers = triggers.sort((a, b) => b.data.command.length - a.data.command.length)
        for (const trigger of triggers) {
          const rawCmd = fn.parseCommandFromTriggerAndMessage(chatMessageContext.msg, trigger)
          if (!rawCmd) {
            continue
          }
          const cmdDefs = getUniqueCommandsByTrigger(commands, trigger)
          await fn.tryExecuteCommand(m, rawCmd, cmdDefs, chatClient, target, context, msg)
          break
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
      twitchChannels,
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
          if (messageData.type !== 'reward-redeemed') {
            return
          }

          const redemptionMessage: TwitchChannelPointsEventMessage = messageData
          this.log.debug(redemptionMessage.data.redemption)
          const redemption = redemptionMessage.data.redemption

          const twitchChannel = this.bot.getDb().get('twitch_channel', { channel_id: redemption.channel_id })
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
          const msg = redemption.reward.title
          const rewardRedemptionContext: RewardRedemptionContext = { client: chatClient, target, context, redemption }

          for (const m of this.bot.getModuleManager().all(user.id)) {
            // reward redemption should all have exact key/name of the reward,
            // no sorting required
            const commands = m.getCommands()

            // make a tmp trigger to match commands against
            const trigger = newRewardRedemptionTrigger(redemption.reward.title)
            const rawCmd: RawCommand = {
              name: redemption.reward.title,
              args: redemption.user_input ? [redemption.user_input] : [],
            }
            const cmdDefs = getUniqueCommandsByTrigger(commands, trigger)
            await fn.tryExecuteCommand(m, rawCmd, cmdDefs, chatClient, target, context, msg)
            await m.onRewardRedemption(rewardRedemptionContext)
          }
        })
      })
    }

    if (this.chatClient) {
      this.chatClient.connect()
    }
    if (this.pubSubClient) {
      this.pubSubClient.connect()
    }

    // to delete all subscriptions
    // ;(async () => {
    //   if (!this.helixClient) {
    //     return
    //   }
    //   const subzz = await this.helixClient.getSubscriptions()
    //   for (const s of subzz.data) {
    //     await this.helixClient.deleteSubscription(s.id)
    //   }
    // })()
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
