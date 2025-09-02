'use strict'

import { newSubscribeTrigger } from '../../common/commands'
import { logger } from '../../common/fn'
import type { Bot, RawCommand } from '../../types'
import { CommandExecutor } from '../CommandExecutor'
import type { User } from '../../repo/Users'
import { EventSubEventHandler } from './EventSubEventHandler'
import { getUserTypeInfo } from '../../fn'
import type { Subscription } from './EventSub'
import type { TwitchEventContext } from '../twitch'

const log = logger('SubscribeEventHandler.ts')

interface SubscribeEvent {
  user_id: string
  user_login: string
  user_name: string
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  tier: string
  is_gift: boolean
}

export class SubscribeEventHandler extends EventSubEventHandler<SubscribeEvent> {
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: Subscription, event: SubscribeEvent },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.subscribe',
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
    }
    const trigger = newSubscribeTrigger()
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date())
  }
}
