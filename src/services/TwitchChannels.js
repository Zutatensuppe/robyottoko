const TABLE = 'twitch_channel'

function TwitchChannels(db) {
  return {
    allByUserId: (user_id) => db.getMany(TABLE, {user_id})
  }
}

module.exports = TwitchChannels
