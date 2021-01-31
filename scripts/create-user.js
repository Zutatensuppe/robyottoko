const config = require('../src/config.js')
const storage = require('../src/storage')

const twitch = require('../src/services/twitch.js')

;(async () => {
  const db = new storage.Db(config.db.file)

  const user = {
    name: '', // username
    pass: '', // pass
    // for tmi in general, see: https://dev.twitch.tv/docs/irc/#building-the-bot
    tmi_identity_username: '', // bot name
    tmi_identity_password: '', // bot oauth token
    tmi_identity_client_id: '', // bot app client id
    tmi_identity_client_secret: '', // bot app client secret
  }

  const twitch_channels = []

  const user_id = db.upsert('user', user, {name: user.name}, 'id')
  console.log('user created/updated: ' + user_id)

  const helixClient = new twitch.HelixClient(
    user.tmi_identity_client_id,
    user.tmi_identity_client_secret
  )

  for (let channel of twitch_channels) {
    let ch = {
      user_id,
      channel_name: channel,
      channel_id: await helixClient.getUserIdByName(channel),
    }
    db.upsert('twitch_channel', ch, ch, 'id')
  }
  db.close()
})()
