import tmi from 'tmi.js'
import TwitchPubSubClient from '../services/TwitchPubSubClient.js'
import TwitchHelixClient from '../services/TwitchHelixClient.js'
import fn from '../fn.js'
import Db from '../Db.js'
import TwitchChannels from '../services/TwitchChannels.js'
import EventHub from '../EventHub.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

class TwitchClientManager {
  constructor(
    /** @type EventHub */ eventHub,
    cfg,
    /** @type Db */ db,
    user,
    /** @type TwitchChannels */ twitchChannelRepo,
    moduleManager,
  ) {
    this.eventHub = eventHub
    this.cfg = cfg
    this.db = db
    this.user = user
    this.twitchChannelRepo = twitchChannelRepo
    this.moduleManager = moduleManager

    this.init('init')

    eventHub.on('user_changed', (tmpUser) => {
      if (tmpUser.id === user.id) {
        this.user = tmpUser
        this.init('user_change')
      }
    })
  }

  async init(reason) {
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
    if (this.pubSubClient) {
      try {
        this.pubSubClient.disconnect()
      } catch (e) { }
    }

    const twitchChannels = twitchChannelRepo.allByUserId(user.id)
    if (twitchChannels.length === 0) {
      log.info(`* No twitch channels configured`)
      return
    }

    this.identity = (
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

    // connect to chat via tmi (to all channels configured)
    this.chatClient = new tmi.client({
      identity: {
        username: this.identity.username,
        password: this.identity.password,
        client_id: this.identity.client_id,
      },
      channels: twitchChannels.map(ch => ch.channel_name),
      connection: {
        reconnect: true,
      }
    })

    this.chatClient.on('message', async (target, context, msg, self) => {
      if (self) { return; } // Ignore messages from the bot

      // log.info(context)
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

      for (const m of moduleManager.all(user.id)) {
        const commands = m.getCommands() || {}
        const cmdDefs = commands[rawCmd.name] || []
        await fn.tryExecuteCommand(m, rawCmd, cmdDefs, this.chatClient, target, context, msg)
        await m.onChatMsg(this.chatClient, target, context, msg);
      }
    })

    // Called every time the bot connects to Twitch chat
    this.chatClient.on('connected', (addr, port) => {
      log.info(`* Connected to ${addr}:${port}`)
      for (let channel of twitchChannels) {
        // note: this can lead to multiple messages if multiple users
        //       have the same channels set up
        const say = fn.sayFn(this.chatClient, channel.channel_name)
        if (reason === 'init') {
          say('⚠️ Bot connected (init) ⚠️')
        } else if (reason === 'user_change') {
          say('⚠️ Bot connected (user_change) ⚠️')
        } else {
          say('⚠️ Bot connected (???) ⚠️')
        }
      }
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

    this.chatClient.connect()
    // this.pubSubClient.connect()

    // register EventSub
    // @see https://dev.twitch.tv/docs/eventsub
    this.helixClient = new TwitchHelixClient(
      this.identity.client_id,
      this.identity.client_secret
    )

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
