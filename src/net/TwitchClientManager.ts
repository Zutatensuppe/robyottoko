// @ts-ignore
import tmi from 'tmi.js'
import TwitchHelixClient from '../services/TwitchHelixClient'
import fn from '../fn'
import Db from '../Db'
import TwitchChannels from '../services/TwitchChannels'
import EventHub from '../EventHub'
import { fileURLToPath } from 'url'
import { User } from '../services/Users'
import ModuleManager from '../mod/ModuleManager'
import Variables from '../services/Variables'
import { TwitchChatClient, TwitchChatContext, TwitchConfig } from '../types'

const __filename = fileURLToPath(import.meta.url)

interface Identity {
  username: string
  password: string
  client_id: string
  client_secret: string
}

class TwitchClientManager {
  private cfg: TwitchConfig
  private db: Db
  private user: User
  private twitchChannelRepo: TwitchChannels
  private moduleManager: ModuleManager

  private chatClient: TwitchChatClient | null = null
  private helixClient: TwitchHelixClient | null = null
  private identity: Identity | null = null

  constructor(
    eventHub: EventHub,
    cfg: TwitchConfig,
    db: Db,
    user: User,
    twitchChannelRepo: TwitchChannels,
    moduleManager: ModuleManager,
  ) {
    this.cfg = cfg
    this.db = db
    this.user = user
    this.twitchChannelRepo = twitchChannelRepo
    this.moduleManager = moduleManager

    this.init('init')

    eventHub.on('user_changed', (changedUser: User) => {
      if (changedUser.id === user.id) {
        this.user = changedUser
        this.init('user_change')
      }
    })
  }

  async init(reason: string) {
    let connectReason = reason
    const cfg = this.cfg
    const db = this.db
    const user = this.user
    const twitchChannelRepo = this.twitchChannelRepo
    const moduleManager = this.moduleManager

    const log = fn.logger(__filename, `${user.name}|`)

    if (this.chatClient) {
      try {
        await this.chatClient.disconnect()
      } catch (e) { }
    }
    // if (this.pubSubClient) {
    //   try {
    //     this.pubSubClient.disconnect()
    //   } catch (e) { }
    // }

    const twitchChannels = twitchChannelRepo.allByUserId(user.id)
    if (twitchChannels.length === 0) {
      log.info(`* No twitch channels configured`)
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
      if (fn.isMod(context)) {
        roles.push('M')
      }
      if (fn.isSubscriber(context)) {
        roles.push('S')
      }
      if (fn.isBroadcaster(context)) {
        roles.push('B')
      }
      log.info(`${context.username}[${roles.join('')}]@${target}: ${msg}`)
      const rawCmd = fn.parseCommandFromMessage(msg)

      db.insert('chat_log', {
        created_at: `${new Date().toJSON()}`,
        broadcaster_user_id: context['room-id'],
        user_name: context.username,
        display_name: context['display-name'],
        message: msg,
      })
      const chatMessageContext = { client: chatClient, target, context, msg }

      for (const m of moduleManager.all(user.id)) {
        const commands = m.getCommands() || {}
        const cmdDefs = commands[rawCmd.name] || []
        await fn.tryExecuteCommand(m, rawCmd, cmdDefs, chatClient, target, context, msg)
        await m.onChatMsg(chatMessageContext);
      }
    })

    // Called every time the bot connects to Twitch chat
    chatClient.on('connected', (addr: string, port: number) => {
      log.info(`* Connected to ${addr}:${port}`)
      for (let channel of twitchChannels) {
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

    // connect to PubSub websocket
    // https://dev.twitch.tv/docs/pubsub#topics
    // this.pubSubClient = TwitchPubSubClient()
    // this.pubSubClient.on('open', async () => {
    //   // listen for evts
    //   for (let channel of twitchChannels) {
    //     if (channel.access_token && channel.channel_id) {
    //       this.pubSubClient.listen(
    //         `channel-points-channel-v1.${channel.channel_id}`,
    //         channel.access_token
    //       )
    //     }
    //   }
    //   this.pubSubClient.on('message', (message) => {
    //     if (message.type !== 'MESSAGE') {
    //       return
    //     }
    //     const messageData = JSON.parse(message.data.message)

    //     // channel points redeemed with non standard reward
    //     // standard rewards are not supported :/
    //     if (messageData.type === 'reward-redeemed') {
    //       const redemption = messageData.data.redemption
    //       // redemption.reward
    //       // { id, channel_id, title, prompt, cost, ... }
    //       // redemption.userchatClient
    //       // { id, login, display_name}
    //       for (const m of moduleManager.all(user.id)) {
    //         if (m.handleRewardRedemption) {
    //           m.handleRewardRedemption(redemption)
    //         }
    //       }
    //     }
    //   })
    // })

    chatClient.connect()
    // this.pubSubClient.connect()

    // register EventSub
    // @see https://dev.twitch.tv/docs/eventsub
    const helixClient = new TwitchHelixClient(
      identity.client_id,
      identity.client_secret
    )
    this.helixClient = helixClient

    // to delete all subscriptions
    // ;(async () => {
    //   const subzz = await this.helixClient.getSubscriptions()
    //   for (const s of subzz.data) {
    //     console.log(s.id)
    //     await this.helixClient.deleteSubscription(s.id)
    //   }
    // })()
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
