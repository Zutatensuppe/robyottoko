const tmi = require('tmi.js')
const TwitchPubSubClient = require('../services/TwitchPubSubClient.js')
const TwitchHelixClient = require('../services/TwitchHelixClient.js')
const fn = require('../fn.js')
const Db = require('../Db.js')

class TwitchClientManager {
  constructor(
    cfg,
    /** @type Db */ db,
    user,
    twitchChannels,
    moduleManager,
  ) {
    const log = fn.logger(__filename, `${user.name}|`)

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
      client_secret: user.tmi.identity.client_secret,
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

      log.info(`${context.username}@${target}: ${msg}`)
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
        const say = fn.sayFn(this.chatClient, channel.channel_name)
        say('⚠️ Bot restarted ⚠️')
      }
    })

    // connect to PubSub websocket
    // https://dev.twitch.tv/docs/pubsub#topics
    this.pubSubClient = TwitchPubSubClient()
    this.pubSubClient.on('open', async () => {
      // listen for evts
      for (let channel of twitchChannels) {
        if (channel.access_token && channel.channel_id) {
          this.pubSubClient.listen(
            `channel-points-channel-v1.${channel.channel_id}`,
            channel.access_token
          )
        }
      }
      this.pubSubClient.on('message', (message) => {
        if (message.type !== 'MESSAGE') {
          return
        }
        const messageData = JSON.parse(message.data.message)

        // channel points redeemed with non standard reward
        // standard rewards are not supported :/
        if (messageData.type === 'reward-redeemed') {
          const redemption = messageData.data.redemption
          // redemption.reward
          // { id, channel_id, title, prompt, cost, ... }
          // redemption.user
          // { id, login, display_name}
          for (const m of moduleManager.all(user.id)) {
            if (m.handleRewardRedemption) {
              m.handleRewardRedemption(redemption)
            }
          }
        }
      })
    })

    this.chatClient.connect()
    this.pubSubClient.connect()

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

module.exports = TwitchClientManager
