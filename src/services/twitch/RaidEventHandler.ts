'use strict'

import { newRaidTrigger } from '../../common/commands'
import { logger } from '../../common/fn'
import type { Bot, RawCommand } from '../../types'
import { CommandExecutor } from '../CommandExecutor'
import type { User } from '../../repo/Users'
import { EventSubEventHandler } from './EventSubEventHandler'
import { getUserTypeInfo } from '../../fn'
import type { Subscription } from './EventSub'
import type { TwitchEventContext } from '../twitch'

const log = logger('RaidEventHandler.ts')

// https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelraid
interface RaidEvent {
  from_broadcaster_user_id: string
  from_broadcaster_user_login: string
  from_broadcaster_user_name: string
  to_broadcaster_user_id: string
  to_broadcaster_user_login: string
  to_broadcaster_user_name: string
  viewers: number
}

export class RaidEventHandler extends EventSubEventHandler<RaidEvent> {
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: Subscription, event: RaidEvent },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.raid',
      args: [],
    }

    const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.from_broadcaster_user_id)
    const context: TwitchEventContext = {
      channelId: data.event.to_broadcaster_user_id,
      userId: data.event.from_broadcaster_user_id,
      userDisplayName: data.event.from_broadcaster_user_name,
      userLoginName: data.event.from_broadcaster_user_login,
      isMod: mod,
      isSubscriber: subscriber,
      isVip: vip,
      extra: {
        raiders: {
          amount: data.event.viewers,
        },
      },
    }
    const trigger = newRaidTrigger()
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date())
  }
}
