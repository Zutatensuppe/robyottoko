'use strict'

import { Repo } from './Repo'

const TABLE = 'robyottoko.event_sub'

interface Row {
  user_id: number
  subscription_id: string
  subscription_type: string
}

export class EventSubRepo extends Repo {

  async insert(sub: Row): Promise<void> {
    await this.db.upsert<Row>(TABLE, sub, {
      subscription_id: sub.subscription_id,
    })
  }

  async delete(where: { user_id: number, subscription_id: string }): Promise<void> {
    await this.db.delete(TABLE, where)
  }

  async getBySubscriptionId(subscriptionId: string): Promise<Row | null> {
    return await this.db.get(TABLE, { subscription_id: subscriptionId })
  }
}
