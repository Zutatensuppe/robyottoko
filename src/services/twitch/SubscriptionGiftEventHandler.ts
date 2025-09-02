'use strict'

import { newGiftSubscribeTrigger } from '../../common/commands'
import { logger } from '../../common/fn'
import type { Bot, RawCommand } from '../../types'
import { CommandExecutor } from '../CommandExecutor'
import type { User } from '../../repo/Users'
import { EventSubEventHandler } from './EventSubEventHandler'
import { getUserTypeInfo } from '../../fn'
import type { Subscription } from './EventSub'
import type { TwitchEventContext } from '../twitch'

const log = logger('SubscriptionGiftEventHandler.ts')

interface SubscriptionGiftEvent {
  user_id: string
  user_login: string
  user_name: string
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  total: number
  tier: string
  cumulative_total: null|number
  is_anonymous: boolean
}

export class SubscriptionGiftEventHandler extends EventSubEventHandler<SubscriptionGiftEvent> {
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: Subscription, event: SubscriptionGiftEvent },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.subscription.gift',
      args: [],
    }

    const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.user_id)
    const context: TwitchEventContext = {
      channelId: data.event.broadcaster_user_id,
      userId: data.event.user_id,
      userDisplayName: data.event.user_name,
      userLoginName: data.event.user_login,
      isMod: mod,
      isSubscriber: subscriber,
      isVip: vip,
      extra: {
        giftsubs: {
          amount: data.event.total,
        },
      },
    }
    const trigger = newGiftSubscribeTrigger()
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date())
  }
}
