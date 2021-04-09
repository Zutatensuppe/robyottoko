const TABLE = 'twitch_channel'

function TwitchChannels(db) {
  return {
    allByUserId: (user_id) => db.getMany(TABLE, {user_id}),
    save: (channel) => db.upsert(TABLE, channel, {
      user_id: channel.user_id,
      channel_name: channel.channel_name,
    }),
  }
}

module.exports = TwitchChannels
