'use strict'

import { newSubscribeTrigger } from "../../common/commands"
import { logger } from "../../common/fn"
import { Bot, RawCommand, TwitchChatContext } from "../../types"
import { CommandExecutor } from "../CommandExecutor"
import { User } from "../../repo/Users"
import { EventSubEventHandler } from "./EventSubEventHandler"
import { getUserTypeInfo } from "../../fn"

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
  // TODO: use better type info
  async handle(
    bot: Bot,
    user: User,
    data: { subscription: any, event: SubscribeEvent },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.subscribe',
      args: [],
    }

    const { mod, subscriber } = await getUserTypeInfo(bot, user, data.event.user_id)
    const target = data.event.broadcaster_user_name
    const context: TwitchChatContext = {
      "room-id": data.event.broadcaster_user_id,
      "user-id": data.event.user_id,
      "display-name": data.event.user_name,
      username: data.event.user_login,
      mod,
      subscriber,
      badges: {},
    }
    const trigger = newSubscribeTrigger()
    const exec = new CommandExecutor()
    await exec.executeMatchingCommands(bot, user, rawCmd, target, context, [trigger], new Date())
  }
}
