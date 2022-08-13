'use strict'

import { newRaidTrigger } from "../../common/commands"
import { logger } from "../../common/fn"
import { Bot, RawCommand, TwitchChatContext } from "../../types"
import { CommandExecutor } from "../CommandExecutor"
import { User } from "../Users"

const log = logger('RaidEventHandler.ts')

export class RaidEventHandler {
  // TODO: use better type info
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: any, event: any },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.raid',
      args: [],
    }

    const target = data.event.broadcaster_user_name
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
    await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger])
  }
}
