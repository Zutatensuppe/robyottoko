import Db, { WhereRaw } from "../DbPostgres"

const TABLE = 'robyottoko.twitch_channel'

export interface TwitchChannel {
  user_id: number
  channel_name: string
  channel_id: string
  access_token: string | null
  bot_status_messages: number
}

export interface TwitchChannelWithAccessToken {
  user_id: number
  channel_name: string
  channel_id: string
  access_token: string
  bot_status_messages: number
}

interface UpdateTwitchChannel {
  user_id?: number
  channel_name?: string
  channel_id?: string
  access_token?: string
  bot_status_messages?: number
}

class TwitchChannels {
  private db: Db

  constructor(db: Db) {
    this.db = db
  }

  async save(channel: UpdateTwitchChannel): Promise<void> {
    await this.db.upsert(TABLE, channel, {
      user_id: channel.user_id,
      channel_name: channel.channel_name,
    })
  }

  async setStreaming(streaming: boolean, where: WhereRaw): Promise<void> {
    this.db.update(TABLE, { is_streaming: streaming }, where)
  }

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
