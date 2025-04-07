'use strict'

import { newGiftSubscribeTrigger } from '../../common/commands'
import { logger } from '../../common/fn'
import { Bot, RawCommand } from '../../types'
import { CommandExecutor } from '../CommandExecutor'
import { User } from '../../repo/Users'
import { EventSubEventHandler } from './EventSubEventHandler'
import { getUserTypeInfo } from '../../fn'
import { Subscription } from './EventSub'
import { TwitchEventContext } from '../twitch'

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
      'room-id': data.event.broadcaster_user_id,
      'user-id': data.event.user_id,
      'display-name': data.event.user_name,
      username: data.event.user_login,
      mod,
      subscriber,
      badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
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
