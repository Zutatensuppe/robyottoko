'use strict'

import { newBitsTrigger } from '../../common/commands'
import { logger } from '../../common/fn'
import type { Bot, RawCommand } from '../../types'
import { CommandExecutor } from '../CommandExecutor'
import type { User } from '../../repo/Users'
import { EventSubEventHandler } from './EventSubEventHandler'
import { getUserTypeInfo } from '../../fn'
import type { Subscription } from './EventSub'
import type { TwitchEventContext } from '../twitch'

const log = logger('CheerEventHandler.ts')

interface CheerEvent {
  is_anonymous: boolean
  user_id: string
  user_login: string
  user_name: string
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  message: string
  bits: number
}

export class CheerEventHandler extends EventSubEventHandler<CheerEvent> {
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: Subscription, event: CheerEvent },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.cheer',
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
        bits: {
          amount: data.event.bits,
        },
      },
    }
    const trigger = newBitsTrigger()
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date())
  }
}
