'use strict'

import { newRewardRedemptionTrigger } from '../../common/commands'
import { logger } from '../../common/fn'
import type { Bot, RawCommand } from '../../types'
import { CommandExecutor } from '../CommandExecutor'
import type { User } from '../../repo/Users'
import { EventSubEventHandler } from './EventSubEventHandler'
import { getUserTypeInfo } from '../../fn'
import type { Subscription } from './EventSub'
import type { TwitchEventContext } from '../twitch'

const log = logger('ChannelPointRedeemEventHandler.ts')

export class ChannelPointRedeemEventHandler extends EventSubEventHandler<any> {
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: Subscription, event: any },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: data.event.reward.title,
      args: data.event.user_input ? [data.event.user_input] : [],
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
    const trigger = newRewardRedemptionTrigger(data.event.reward.title)
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date())
  }
}
