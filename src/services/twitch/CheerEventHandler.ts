'use strict'

import { newBitsTrigger } from "../../common/commands"
import { logger } from "../../common/fn"
import { Bot, RawCommand, TwitchChatContext } from "../../types"
import { CommandExecutor } from "../CommandExecutor"
import { User } from "../../repo/Users"
import { EventSubEventHandler } from "./EventSubEventHandler"

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
  // TODO: use better type info
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: any, event: CheerEvent },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.cheer',
      args: [],
    }
    const target = data.event.broadcaster_user_name
    const context: TwitchChatContext = {
      "room-id": data.event.broadcaster_user_id,
      "user-id": data.event.user_id,
      "display-name": data.event.user_name,
      username: data.event.user_login,
      mod: false, // no way to tell without further looking up user somehow
      subscriber: false, // unknown
      badges: {},
    }
    const trigger = newBitsTrigger()
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger], new Date())
  }
}
