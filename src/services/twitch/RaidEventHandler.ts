'use strict'

import { newRaidTrigger } from "../../common/commands"
import { logger } from "../../common/fn"
import { Bot, RawCommand, TwitchChatContext } from "../../types"
import { CommandExecutor } from "../CommandExecutor"
import { User } from "../../repo/Users"
import { EventSubEventHandler } from "./EventSubEventHandler"

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

    const target = data.event.to_broadcaster_user_name
    const context: TwitchChatContext = {
      "room-id": data.event.to_broadcaster_user_id,
      "user-id": data.event.from_broadcaster_user_id,
      "display-name": data.event.from_broadcaster_user_name,
      username: data.event.from_broadcaster_user_login,
      mod: false, // unknown
      subscriber: false, // unknown
      badges: {},
    }
    const trigger = newRaidTrigger()
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger], new Date())
  }
}
