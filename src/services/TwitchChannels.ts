import Db from "../DbPostgres"

const TABLE = 'robyottoko.twitch_channel'

export interface TwitchChannel {
  user_id: number
  channel_name: string
  channel_id: string
  access_token: string | null
  bot_status_messages: number
  is_streaming: boolean
}

interface UpdateTwitchChannel {
  user_id?: number
  channel_name?: string
  channel_id?: string
  access_token?: string
  bot_status_messages?: number
  is_streaming?: boolean
}

class TwitchChannels {
  constructor(private readonly db: Db) {
  }

  async save(channel: UpdateTwitchChannel | TwitchChannel): Promise<void> {
    await this.db.upsert(TABLE, channel, {
      user_id: channel.user_id,
      channel_name: channel.channel_name,
    })
  }

  // TODO: remove,replace
  async countUniqueUsersStreaming(): Promise<number> {
    const channels = await this.db.getMany(TABLE, { is_streaming: true })
    const userIds = [...new Set(channels.map(c => c.user_id))]
    return userIds.length
  }

  async allByUserId(user_id: number): Promise<TwitchChannel[]> {
    return await this.db.getMany(TABLE, { user_id })
  }

  async saveUserChannels(user_id: number, channels: UpdateTwitchChannel[]): Promise<void> {
    for (const channel of channels) {
      await this.save(channel)
    }
    await this.db.delete(TABLE, {
      user_id: user_id,
      channel_name: { '$nin': channels.map(c => c.channel_name) }
    })
  }
}

export default TwitchChannels
