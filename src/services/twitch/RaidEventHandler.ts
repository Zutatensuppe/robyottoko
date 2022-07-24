'use strict'

import { newRaidTrigger } from "../../common/commands"
import { logger } from "../../common/fn"
import TwitchClientManager from "../../net/TwitchClientManager"
import { RawCommand, TwitchChatContext } from "../../types"

const log = logger('RaidEventHandler.ts')

export class RaidEventHandler {
  // TODO: use better type info
  async handle(
    tcm: TwitchClientManager,
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
    }
    const trigger = newRaidTrigger()
    await tcm.executeMatchingCommands(rawCmd, target, context, trigger)
  }
}
