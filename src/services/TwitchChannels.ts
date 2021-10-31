import Db from "../Db"

const TABLE = 'twitch_channel'

interface TwitchChannel {
  user_id: number
  channel_name: string
  channel_id: string
  access_token: string | null
}

interface UpdateTwitchChannel {
  user_id?: number
  channel_name?: string
  channel_id?: string
  access_token?: string
}

class TwitchChannels {
  private db: Db

  constructor(db: Db) {
    this.db = db
  }

  save(channel: UpdateTwitchChannel) {
    return this.db.upsert(TABLE, channel, {
      user_id: channel.user_id,
      channel_name: channel.channel_name,
    })
  }

  allByUserId(user_id: number): TwitchChannel[] {
    return this.db.getMany(TABLE, { user_id })
  }

  saveUserChannels(user_id: number, channels: UpdateTwitchChannel[]) {
    for (const channel of channels) {
      this.save(channel)
    }
    this.db.delete(TABLE, {
      user_id: user_id,
      channel_name: { '$nin': channels.map(c => c.channel_name) }
    })
  }
}

export default TwitchChannels
