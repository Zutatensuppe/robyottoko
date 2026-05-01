'use strict'

import { Repo } from './Repo'

const TABLE = 'robyottoko.event_sub'
const SUBSCRIPTION_STATE_TABLE = 'robyottoko.event_sub_subscription_state'

export enum EventSubSubscriptionState {
  BlockedAuthorization = 'blocked_authorization',
}

interface Row {
  user_id: number
  subscription_id: string
  subscription_type: string
}

interface SubscriptionStateRow {
  user_id: number
  subscription_type: string
  state: EventSubSubscriptionState
  state_reason: string
  updated_at: Date
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

  async upsertSubscriptionState(
    userId: number,
    subscriptionType: string,
    state: EventSubSubscriptionState,
    stateReason: string = '',
  ): Promise<void> {
    await this.db.upsert<SubscriptionStateRow>(SUBSCRIPTION_STATE_TABLE, {
      user_id: userId,
      subscription_type: subscriptionType,
      state,
      state_reason: stateReason,
      updated_at: new Date(),
    }, {
      user_id: userId,
      subscription_type: subscriptionType,
    })
  }

  async clearSubscriptionState(
    userId: number,
    subscriptionType: string,
  ): Promise<void> {
    await this.db.delete(SUBSCRIPTION_STATE_TABLE, {
      user_id: userId,
      subscription_type: subscriptionType,
    })
  }

  async clearSubscriptionStatesForUser(userId: number): Promise<void> {
    await this.db.delete(SUBSCRIPTION_STATE_TABLE, {
      user_id: userId,
    })
  }

  async getSubscriptionTypesByState(
    where: Partial<SubscriptionStateRow>,
  ): Promise<string[]> {
    const rows = await this.db.getMany<SubscriptionStateRow>(
      SUBSCRIPTION_STATE_TABLE,
      where,
    )
    return rows.map(row => row.subscription_type)
  }
}
