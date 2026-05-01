import { describe, expect, it, vi } from 'vitest'
import { AccessTokenUpdater } from './AccessTokenUpdater'
import type { Bot } from '../types'
import type { User } from '../repo/Users'

function createMockUser(id: number): User {
  return {
    id,
    name: `user${id}`,
    twitch_id: `twitch_${id}`,
    twitch_login: `user${id}_channel`,
  } as User
}

function createMockBot(overrides: {
  supportTwitchAccessTokens?: boolean
  helixClient?: any
  refreshFailures?: number
  matchingRow?: any
  validateResult?: { valid: boolean }
  refreshResult?: { token: string } | { error: string }
  getUserById?: (id: number) => any
} = {}) {
  const {
    supportTwitchAccessTokens = true,
    helixClient = {},
    refreshFailures = 0,
    matchingRow = undefined,
    validateResult = { valid: false },
    refreshResult = { error: 'refresh_oauth_token_failed' },
    getUserById,
  } = overrides

  const defaultRow = matchingRow !== undefined ? matchingRow : {
    access_token: 'some-token',
    refresh_token: 'some-refresh',
    expires_at: new Date(0).toISOString(),
    refresh_failures: refreshFailures,
  }

  const mockHelixClient = {
    getUserIdByNameCached: vi.fn().mockResolvedValue('channel_123'),
    validateOAuthToken: vi.fn().mockResolvedValue(validateResult),
    tryRefreshAccessToken: vi.fn().mockResolvedValue(refreshResult),
    ...helixClient,
  }

  const oauthToken = {
    getMatchingRow: vi.fn().mockResolvedValue(defaultRow),
    setRefreshFailures: vi.fn().mockResolvedValue(undefined),
    resetRefreshFailuresForUser: vi.fn().mockResolvedValue(undefined),
  }

  const user = {
    all: vi.fn().mockResolvedValue([createMockUser(1), createMockUser(2)]),
    getById: getUserById ?? vi.fn().mockImplementation(async (id: number) => createMockUser(id)),
  }

  const repos = { oauthToken, user }
  const eventHub = { emit: vi.fn() }

  const bot = {
    getConfig: () => ({ bot: { supportTwitchAccessTokens } }),
    getUserTwitchClientManager: () => ({
      getHelixClient: () => mockHelixClient,
    }),
    getRepos: () => repos,
    getEventHub: () => eventHub,
    getCache: () => ({}),
  } as unknown as Bot

  return { bot, oauthToken, eventHub, mockHelixClient, user: user }
}

describe('AccessTokenUpdater', () => {
  describe('doUpdateForUser', () => {
    it('returns empty when supportTwitchAccessTokens is false', async () => {
      const { bot } = createMockBot({ supportTwitchAccessTokens: false })
      const updater = new AccessTokenUpdater(bot)
      const result = await updater.doUpdateForUser(createMockUser(1))
      expect(result).toEqual([])
    })

    it('returns empty when no matching row exists', async () => {
      const { bot } = createMockBot({ matchingRow: null })
      const updater = new AccessTokenUpdater(bot)
      const result = await updater.doUpdateForUser(createMockUser(1))
      expect(result).toEqual([])
    })

    it('returns empty when token is valid', async () => {
      const { bot } = createMockBot({ validateResult: { valid: true } })
      const updater = new AccessTokenUpdater(bot)
      const result = await updater.doUpdateForUser(createMockUser(1))
      expect(result).toEqual([])
    })

    it('returns access_token_invalid on refresh failure', async () => {
      const { bot } = createMockBot({ refreshResult: { error: 'refresh_oauth_token_failed' } })
      const updater = new AccessTokenUpdater(bot)
      const user = createMockUser(1)
      const result = await updater.doUpdateForUser(user)
      expect(result).toEqual([{
        message: 'access_token_invalid',
        details: { channel_name: user.twitch_login },
      }])
    })

    it('calls setRefreshFailures on failure', async () => {
      const { bot, oauthToken } = createMockBot({ refreshResult: { error: 'refresh_oauth_token_failed' } })
      const updater = new AccessTokenUpdater(bot)
      await updater.doUpdateForUser(createMockUser(1))
      expect(oauthToken.setRefreshFailures).toHaveBeenCalledWith('some-token', 1)
    })

    it('skips API call when refresh_failures >= MAX_REFRESH_FAILURES', async () => {
      const { bot, mockHelixClient } = createMockBot({ refreshFailures: 3 })
      const updater = new AccessTokenUpdater(bot)
      const user = createMockUser(1)

      const result = await updater.doUpdateForUser(user)
      expect(mockHelixClient.validateOAuthToken).not.toHaveBeenCalled()
      expect(result).toEqual([{
        message: 'access_token_invalid',
        details: { channel_name: user.twitch_login },
      }])
    })

    it('emits access_token_refreshed on successful refresh', async () => {
      const { bot, eventHub } = createMockBot({ refreshResult: { token: 'new-token' } })
      const updater = new AccessTokenUpdater(bot)
      await updater.doUpdateForUser(createMockUser(1))
      expect(eventHub.emit).toHaveBeenCalledWith('access_token_refreshed', expect.anything())
    })

    it('does not set failures when token is valid', async () => {
      const { bot, oauthToken } = createMockBot({ validateResult: { valid: true } })
      const updater = new AccessTokenUpdater(bot)
      await updater.doUpdateForUser(createMockUser(1))
      expect(oauthToken.setRefreshFailures).not.toHaveBeenCalled()
    })
  })

  describe('resetFailures', () => {
    it('calls resetRefreshFailuresForUser on the repo', async () => {
      const { bot, oauthToken } = createMockBot()
      const updater = new AccessTokenUpdater(bot)
      await updater.resetFailures(1)
      expect(oauthToken.resetRefreshFailuresForUser).toHaveBeenCalled()
    })

    it('does nothing when user does not exist', async () => {
      const { bot, oauthToken } = createMockBot({ getUserById: vi.fn().mockResolvedValue(null) })
      const updater = new AccessTokenUpdater(bot)
      await updater.resetFailures(999)
      expect(oauthToken.resetRefreshFailuresForUser).not.toHaveBeenCalled()
    })
  })
})
