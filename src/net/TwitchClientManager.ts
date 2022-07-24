// @ts-ignore
import tmi from 'tmi.js'
import TwitchHelixClient from '../services/TwitchHelixClient'
import fn from '../fn'
import { logger, Logger, MINUTE } from '../common/fn'
import { TwitchChannel } from '../services/TwitchChannels'
import { User } from '../services/Users'
import { Bot, CommandTrigger, CommandTriggerType, EventSubTransport, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import { getUniqueCommandsByTriggers } from '../common/commands'
import { isBroadcaster, isMod, isSubscriber } from '../common/permissions'
import { WhereRaw } from '../DbPostgres'
import { ALL_SUBSCRIPTIONS_TYPES } from '../services/twitch/EventSub'

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

const rolesLettersFromTwitchChatContext = (context: TwitchChatContext): string[] => {
  const roles: string[] = []
  if (isMod(context)) {
    roles.push('M')
  }
  if (isSubscriber(context)) {
    roles.push('S')
  }
  if (isBroadcaster(context)) {
    roles.push('B')
  }
  return roles
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

      const roles = rolesLettersFromTwitchChatContext(context)
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
      const determineIsFirstChatAlltime = async (): Promise<boolean> => {
        return await countChatMessages({
          broadcaster_user_id: context['room-id'],
          user_name: context.username,
        }) === 1
      }
      const isFirstChatAlltime = async (): Promise<boolean> => {
        if (_isFirstChatAlltime === null) {
          _isFirstChatAlltime = await determineIsFirstChatAlltime()
        }
        return _isFirstChatAlltime
      }
      const determineIsFirstChatStream = async (): Promise<boolean> => {
        const stream = await helixClient.getStreamByUserId(context['room-id'])
        let minDate: Date
        if (stream) {
          minDate = new Date(stream.started_at)
        } else {
          minDate = new Date(new Date().getTime() - (5 * MINUTE))
          log.info(`No stream is running atm for channel ${context['room-id']}. Using fake start date ${minDate}.`)
        }

        return await countChatMessages({
          broadcaster_user_id: context['room-id'],
          user_name: context.username,
          created_at: { '$gte': minDate },
        }) === 1
      }
      const isFirstChatStream = async (): Promise<boolean> => {
        if (_isFirstChatStream === null) {
          _isFirstChatStream = await determineIsFirstChatStream()
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

  async executeMatchingCommands(
    rawCmd: RawCommand,
    target: string,
    context: TwitchChatContext,
    trigger: CommandTrigger,
  ): Promise<void> {
    const promises: Promise<void>[] = []
    for (const m of this.bot.getModuleManager().all(this.user.id)) {
      const commands = m.getCommands()
      const cmdDefs = getUniqueCommandsByTriggers(commands, [trigger])
      promises.push(fn.tryExecuteCommand(m, rawCmd, cmdDefs, target, context))
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
