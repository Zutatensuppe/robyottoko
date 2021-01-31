const tmi = require('tmi.js')
const twitchPubSub = require('../services/twitchPubSub.js')
const fn = require('../fn.js')

class TwitchClientManager {
  constructor(db, user, moduleManager) {
    this.logprefix = `${user.name}|`

    const twitchChannels = db.getMany('twitch_channel', {user_id: user.id})
    if (twitchChannels.length === 0) {
      console.log(`${this.logprefix}${target}| * No twitch channels configured`)
      return
    }

    // connect to chat via tmi (to all channels configured)
    this.client = new tmi.client({
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

    this.client.on('message', async (target, context, msg, self) => {
      if (self) { return; } // Ignore messages from the bot
      console.log(context)
      console.log(`${this.logprefix}${context.username}@${target}: ${msg}`)
      const rawCmd = fn.parseCommandFromMessage(msg)

      for (const m of moduleManager.all(user.id)) {
        const commands = m.getCommands() || {}
        const cmdDefs = commands[rawCmd.name] || []
        for (let cmdDef of cmdDefs) {
          if (fn.mayExecute(context, cmdDef)) {
            console.log(`${this.logprefix}${target}| * Executing ${rawCmd.name} command`)
            const r = await cmdDef.fn(rawCmd, this.client, target, context, msg)
            if (r) {
              console.log(`${this.logprefix}${target}| * Returned: ${r}`)
            }
            console.log(`${this.logprefix}${target}| * Executed ${rawCmd.name} command`)
          }
        }
        await m.onChatMsg(this.client, target, context, msg);
      }
    })

    // Called every time the bot connects to Twitch chat
    this.client.on('connected', (addr, port) => {
      console.log(`${this.logprefix} * Connected to ${addr}:${port}`)
    })
    this.client.connect();

    // connect to PubSub websocket
    // https://dev.twitch.tv/docs/pubsub#topics
    this.pubSubClient = twitchPubSub.client()
    this.pubSubClient.connect()
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
        console.log(message)
      })
    })
  }

  getClient() {
    return this.client
  }
}

module.exports = TwitchClientManager
