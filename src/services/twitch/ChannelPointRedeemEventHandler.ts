'use strict'

import { newRewardRedemptionTrigger } from '../../common/commands'
import { logger } from '../../common/fn'
import { Bot, RawCommand } from '../../types'
import { CommandExecutor } from '../CommandExecutor'
import { User } from '../../repo/Users'
import { EventSubEventHandler } from './EventSubEventHandler'
import { getUserTypeInfo } from '../../fn'
import { Subscription } from './EventSub'
import { TwitchEventContext } from '../twitch'

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
      'room-id': data.event.broadcaster_user_id,
      'user-id': data.event.user_id,
      'display-name': data.event.user_name,
      username: data.event.user_login,
      mod,
      subscriber,
      badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
    }
    const trigger = newRewardRedemptionTrigger(data.event.reward.title)
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, context, [trigger], new Date())
  }
}
