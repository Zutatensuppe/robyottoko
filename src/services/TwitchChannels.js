import Db from "../Db.ts"

const TABLE = 'twitch_channel'

function TwitchChannels(/** @type Db */ db) {
  const save = (channel) => db.upsert(TABLE, channel, {
    user_id: channel.user_id,
    channel_name: channel.channel_name,
  })
  return {
    allByUserId: (user_id) => db.getMany(TABLE, { user_id }),
    save,
    saveUserChannels: (user_id, channels) => {
      for (const channel of channels) {
        save(channel)
      }
      db.delete(TABLE, {
        user_id: user_id,
        channel_name: { '$nin': channels.map(c => c.channel_name) }
      })
    },
  }
}

export default TwitchChannels
