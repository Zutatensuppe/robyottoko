import { describe, expect, it, vi } from 'vitest'
import type Db from '../DbPostgres'
import type { JSONDateString } from '../types'
import { OauthTokenRepo } from './OauthTokenRepo'
import type { User } from './Users'

const TABLE = 'robyottoko.oauth_token'

describe('src/repo/OauthTokenRepo.ts', () => {
  it('insert delegates to db.upsert keyed by user_id', async () => {
    const db = {
      upsert: vi.fn().mockResolvedValue(undefined),
    } as unknown as Db

    const repo = new OauthTokenRepo(db)
    const row = {
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      scope: 'a,b',
      token_type: 'bearer',
      user_id: 42,
      channel_id: '12345',
      expires_at: new Date('2026-01-01T00:00:00.000Z').toISOString() as JSONDateString,
    }

    await repo.insert(row)

    expect(db.upsert).toHaveBeenCalledTimes(1)
    expect(db.upsert).toHaveBeenCalledWith(
      TABLE,
      row,
      { user_id: row.user_id },
    )
  })

  it('setRefreshFailures updates refresh_failures for one access token', async () => {
    const db = {
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as Db

    const repo = new OauthTokenRepo(db)
    await repo.setRefreshFailures('access-1', 2)

    expect(db.update).toHaveBeenCalledWith(
      TABLE,
      { refresh_failures: 2 },
      { access_token: 'access-1' },
    )
  })

  it('resetRefreshFailuresForUser resets failures for matching token row', async () => {
    const db = {
      get: vi.fn().mockResolvedValue({
        access_token: 'access-2',
      }),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as Db

    const repo = new OauthTokenRepo(db)
    const user = {
      id: 7,
      twitch_id: 'abc',
    } as User

    await repo.resetRefreshFailuresForUser(user)

    expect(db.get).toHaveBeenCalledWith(
      TABLE,
      { user_id: user.id, channel_id: user.twitch_id },
      [{ expires_at: -1 }],
    )
    expect(db.update).toHaveBeenCalledWith(
      TABLE,
      { refresh_failures: 0 },
      { access_token: 'access-2' },
    )
  })

  it('resetRefreshFailuresForUser is a no-op when no token row exists', async () => {
    const db = {
      get: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as Db

    const repo = new OauthTokenRepo(db)
    const user = {
      id: 7,
      twitch_id: 'abc',
    } as User

    await repo.resetRefreshFailuresForUser(user)

    expect(db.update).not.toHaveBeenCalled()
  })
})
