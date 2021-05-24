const tmi = require('tmi.js')
const TwitchPubSubClient = require('../services/TwitchPubSubClient.js')
const TwitchHelixClient = require('../services/TwitchHelixClient.js')
const fn = require('../fn.js')

class TwitchClientManager {
  constructor(cfg, db, user, twitchChannels, moduleManager) {
    const log = fn.logger(__filename, `${user.name}|`)

    if (twitchChannels.length === 0) {
      log.info(`* No twitch channels configured`)
      return
    }

    // connect to chat via tmi (to all channels configured)
    this.chatClient = new tmi.client({
      identity: {
        username: user.tmi_identity_username,
        password: user.tmi_identity_password,
        client_id: user.tmi_identity_client_id,
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
        for (let cmdDef of cmdDefs) {
          if (fn.mayExecute(context, cmdDef)) {
            log.info(`${target}| * Executing ${rawCmd.name} command`)
            const r = await cmdDef.fn(rawCmd, this.chatClient, target, context, msg)
            if (r) {
              log.info(`${target}| * Returned: ${r}`)
            }
            log.info(`${target}| * Executed ${rawCmd.name} command`)
          }
        }
        await m.onChatMsg(this.chatClient, target, context, msg);
      }
    })

    // Called every time the bot connects to Twitch chat
    this.chatClient.on('connected', (addr, port) => {
      log.info(`* Connected to ${addr}:${port}`)
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
      user.tmi_identity_client_id,
      user.tmi_identity_client_secret
    )

    ;(async () => {
      for (let channel of twitchChannels) {
        if (channel.access_token && channel.channel_id) {
          const transport = cfg.eventSub.transport
          const sub = (type) => ({
            type,
            version: '1',
            condition: {
              broadcaster_user_id: channel.channel_id,
            },
            transport,
          })

          // TODO: dont try to fetch this for each user separately?
          //       or at least fetch filtered by channel.channel_id
          const subs = await this.helixClient.getSubscriptions()
          log.debug(subs.data)

          const enabledSubs = {}
          for (const s of subs.data) {
            // different callbacks dont matter
            // it may be a callback from live vs dev, using the same bot
            if (s.transport.callback !== transport.callback) {
              continue
            }

            // only care about the current channel
            if (s.condition.broadcaster_user_id !== channel.channel_id) {
              continue
            }

            if (s.status !== 'enabled') {
              log.info(`removing subscription (not enabled): ${s.id}`)
              await this.helixClient.deleteSubscription(s.id)
            } else {
              enabledSubs[s.type] = s
            }
          }

          for (const type of ['stream.online', 'stream.offline']) {
            if (!enabledSubs[type]) {
              log.info(`creating subscription: ${channel.channel_name} ${type}`)
              const res = await this.helixClient.createSubscription(sub(type))
              log.debug(res)
            } else {
              log.info(`subscription exists: ${channel.channel_name} ${type}`)
            }
          }
        }
      }
    })()
  }

  getChatClient() {
    return this.chatClient
  }
}

module.exports = TwitchClientManager
