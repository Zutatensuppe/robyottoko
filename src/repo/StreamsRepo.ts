'use strict'

import { toJSONDateString } from '../common/fn'
import type { JSONDateString } from '../types'
import { Repo } from './Repo'

const TABLE = 'robyottoko.streams'

interface Row {
  id: number
  broadcaster_user_id: string
  started_at: JSONDateString
  ended_at: JSONDateString | null
}

export class StreamsRepo extends Repo {

  async getLatestByChannelId(channelId: string): Promise<Row | null> {
    return await this.db.get(TABLE, {
      broadcaster_user_id: channelId,
    }, [{ started_at: -1 }])
  }

  async setEndDate(streamId: string, date: Date): Promise<void> {
    await this.db.update(TABLE, {
      ended_at: toJSONDateString(date),
    }, { id: streamId })
  }

  async insert(data: {
    broadcaster_user_id: string,
    started_at: JSONDateString,
  }): Promise<void> {
    await this.db.insert(TABLE, data)
  }
}
