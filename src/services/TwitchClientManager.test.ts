import { describe, expect, it, vi } from 'vitest'
import { EventSubSubscriptionState } from '../repo/EventSubRepo'
import type { User } from '../repo/Users'
import type { Bot } from '../types'
import TwitchClientManager from './TwitchClientManager'
import { ALL_SUBSCRIPTIONS_TYPES, SubscriptionType } from './twitch/EventSub'

const createUser = (): User => {
  return {
    id: 42 as any,
    twitch_id: '123456',
    twitch_login: 'example_channel',
    name: 'example_user',
    email: 'example@test.local',
    tmi_identity_username: '',
    tmi_identity_password: '',
    tmi_identity_client_id: '',
    tmi_identity_client_secret: '',
    bot_enabled: true,
    bot_status_messages: false,
    is_streaming: false,
  }
}

const createMockBot = (
  blockedAuthorizationSubscriptionTypes: string[] = [],
): { bot: Bot, eventSubRepo: any } => {
  const eventSubRepo = {
    insert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getSubscriptionTypesByState: vi.fn().mockResolvedValue(blockedAuthorizationSubscriptionTypes),
    upsertSubscriptionState: vi.fn().mockResolvedValue(undefined),
    clearSubscriptionState: vi.fn().mockResolvedValue(undefined),
  }

  const bot = {
    getConfig: () => ({
      bot: {
        reportStatus: false,
        supportTwitchAccessTokens: true,
      },
      twitch: {
        eventSub: {
          enabled: true,
          transport: {
            method: 'webhook',
            callback: 'https://example.com/twitch/event-sub/',
            secret: 'test-secret',
          },
        },
      },
    }),
    getRepos: () => ({
      eventSub: eventSubRepo,
    }),
  } as unknown as Bot

  return { bot, eventSubRepo }
}

describe('src/services/TwitchClientManager.ts', () => {
  it('skips subscription creation for blocked authorization types', async () => {
    const user = createUser()
    const { bot, eventSubRepo } = createMockBot([
      SubscriptionType.ChannelFollow,
      SubscriptionType.ChannelCheer,
    ])

    const manager = new TwitchClientManager(bot, user)
    ;(manager as any).helixClient = {
      getSubscriptions: vi.fn().mockResolvedValue({ data: [] }),
    }
    const registerSpy = vi.spyOn(manager, 'registerSubscription').mockResolvedValue('registered')

    await manager.registerSubscriptions(user)

    const calledTypes = registerSpy.mock.calls.map(call => call[0])
    expect(eventSubRepo.getSubscriptionTypesByState).toHaveBeenCalledWith({
      user_id: user.id,
      state: EventSubSubscriptionState.BlockedAuthorization,
    })
    expect(registerSpy).toHaveBeenCalledTimes(ALL_SUBSCRIPTIONS_TYPES.length - 2)
    expect(calledTypes).not.toContain(SubscriptionType.ChannelFollow)
    expect(calledTypes).not.toContain(SubscriptionType.ChannelCheer)
  })

  it('stores blocked_authorization state after a 403 response', async () => {
    const user = createUser()
    const { bot, eventSubRepo } = createMockBot()
    const manager = new TwitchClientManager(bot, user)
    ;(manager as any).helixClient = {
      createSubscription: vi.fn().mockResolvedValue({
        error: 'Forbidden',
        status: 403,
        message: 'subscription missing proper authorization',
      }),
    }

    const result = await manager.registerSubscription(SubscriptionType.ChannelFollow, user)

    expect(result).toBe(EventSubSubscriptionState.BlockedAuthorization)
    expect(eventSubRepo.upsertSubscriptionState).toHaveBeenCalledWith(
      user.id,
      SubscriptionType.ChannelFollow,
      EventSubSubscriptionState.BlockedAuthorization,
      'subscription missing proper authorization',
    )
    expect(eventSubRepo.insert).not.toHaveBeenCalled()
  })

  it('clears subscription state when registration succeeds', async () => {
    const user = createUser()
    const { bot, eventSubRepo } = createMockBot()
    const manager = new TwitchClientManager(bot, user)
    ;(manager as any).helixClient = {
      createSubscription: vi.fn().mockResolvedValue({
        data: [{ id: 'sub-123' }],
      }),
    }

    const result = await manager.registerSubscription(SubscriptionType.StreamOnline, user)

    expect(result).toBe('registered')
    expect(eventSubRepo.insert).toHaveBeenCalledWith({
      user_id: user.id,
      subscription_id: 'sub-123',
      subscription_type: SubscriptionType.StreamOnline,
    })
    expect(eventSubRepo.clearSubscriptionState).toHaveBeenCalledWith(
      user.id,
      SubscriptionType.StreamOnline,
    )
  })
})
