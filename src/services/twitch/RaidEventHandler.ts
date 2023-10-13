'use strict'

import { newRaidTrigger } from '../../common/commands'
import { logger } from '../../common/fn'
import { Bot, RawCommand, TwitchEventContext } from '../../types'
import { CommandExecutor } from '../CommandExecutor'
import { User } from '../../repo/Users'
import { EventSubEventHandler } from './EventSubEventHandler'
import { getUserTypeInfo } from '../../fn'

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
  // TODO: use better type info
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: any, event: RaidEvent },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.raid',
      args: [],
    }

    const { mod, subscriber, vip } = await getUserTypeInfo(bot, user, data.event.from_broadcaster_user_id)
    const context: TwitchEventContext = {
      'room-id': data.event.to_broadcaster_user_id,
      'user-id': data.event.from_broadcaster_user_id,
      'display-name': data.event.from_broadcaster_user_name,
      username: data.event.from_broadcaster_user_login,
      mod,
      subscriber,
      badges: { vip: vip ? '1' : undefined }, // not sure what to put in there
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
