import { describe, expect, it, vi } from 'vitest'
import type Db from '../DbPostgres'
import { EventSubRepo, EventSubSubscriptionState } from './EventSubRepo'

describe('src/repo/EventSubRepo.ts', () => {
  const EVENT_SUB_TABLE = 'robyottoko.event_sub'
  const SUBSCRIPTION_STATE_TABLE = 'robyottoko.event_sub_subscription_state'

  const createMockDb = (stateRows: Array<{ subscription_type: string }> = []) => {
    return {
      upsert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      getMany: vi.fn().mockResolvedValue(stateRows),
    } as unknown as Db
  }

  it('insert upserts by subscription id', async () => {
    const db = createMockDb()
    const repo = new EventSubRepo(db)

    await repo.insert({
      user_id: 12,
      subscription_id: 'sub-1',
      subscription_type: 'stream.online',
    })

    expect(db.upsert).toHaveBeenCalledWith(EVENT_SUB_TABLE, {
      user_id: 12,
      subscription_id: 'sub-1',
      subscription_type: 'stream.online',
    }, {
      subscription_id: 'sub-1',
    })
  })

  it('upserts subscription state', async () => {
    const db = createMockDb()
    const repo = new EventSubRepo(db)

    await repo.upsertSubscriptionState(
      99,
      'channel.follow',
      EventSubSubscriptionState.BlockedAuthorization,
      'subscription missing proper authorization',
    )

    expect(db.upsert).toHaveBeenCalledWith(
      SUBSCRIPTION_STATE_TABLE,
      expect.objectContaining({
        user_id: 99,
        subscription_type: 'channel.follow',
        state: EventSubSubscriptionState.BlockedAuthorization,
        state_reason: 'subscription missing proper authorization',
      }),
      {
        user_id: 99,
        subscription_type: 'channel.follow',
      },
    )
  })

  it('returns subscription types by state for a user', async () => {
    const db = createMockDb([
      { subscription_type: 'channel.follow' },
      { subscription_type: 'channel.subscribe' },
    ])
    const repo = new EventSubRepo(db)

    const blockedTypes = await repo.getSubscriptionTypesByState({
      user_id: 7,
      state: EventSubSubscriptionState.BlockedAuthorization,
    })

    expect(db.getMany).toHaveBeenCalledWith(SUBSCRIPTION_STATE_TABLE, {
      user_id: 7,
      state: EventSubSubscriptionState.BlockedAuthorization,
    })
    expect(blockedTypes).toEqual([
      'channel.follow',
      'channel.subscribe',
    ])
  })

  it('clears one subscription state row', async () => {
    const db = createMockDb()
    const repo = new EventSubRepo(db)

    await repo.clearSubscriptionState(3, 'channel.cheer')

    expect(db.delete).toHaveBeenCalledWith(SUBSCRIPTION_STATE_TABLE, {
      user_id: 3,
      subscription_type: 'channel.cheer',
    })
  })

  it('clears all subscription state rows for a user', async () => {
    const db = createMockDb()
    const repo = new EventSubRepo(db)

    await repo.clearSubscriptionStatesForUser(11)

    expect(db.delete).toHaveBeenCalledWith(SUBSCRIPTION_STATE_TABLE, {
      user_id: 11,
    })
  })
})
