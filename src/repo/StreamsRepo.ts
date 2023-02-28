'use strict'

import { Repo } from './Repo'

const TABLE = 'robyottoko.streams'

interface Row {
  id: number
  broadcaster_user_id: string
}

interface RowOut extends Row {
  started_at: string // json date
  ended_at: string // json date
}

export class StreamsRepo extends Repo {

  async getLatestByChannelId(channelId: string): Promise<RowOut | null> {
    return await this.db.get(TABLE, {
      broadcaster_user_id: channelId,
    }, [{ started_at: -1 }])
  }

  async setEndDate(streamId: string, date: Date): Promise<void> {
    await this.db.update(TABLE, {
      ended_at: date,
    }, { id: streamId })
  }

  async insert(data: {
    broadcaster_user_id: string,
    started_at: Date,
  }): Promise<void> {
    await this.db.insert(TABLE, data)
  }
}
