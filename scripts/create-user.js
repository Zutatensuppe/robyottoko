const config = require('../src/config.js')
const { Db } = require('../src/Db.js')

const db = new Db(config.db.file)

const user = {
  name: '', // username
  pass: '', // pass
  // for tmi in general, see: https://dev.twitch.tv/docs/irc/#building-the-bot
  tmi_identity_username: '', // bot name
  tmi_identity_password: '', // bot oauth token
  tmi_identity_client_id: '', // bot app client id
  twitch_channels: '', // channels, comma separated
}

const id = db.upsert('user', user, {name: user.name}, 'id')
console.log('user created/updated: ' + id)
db.close()
