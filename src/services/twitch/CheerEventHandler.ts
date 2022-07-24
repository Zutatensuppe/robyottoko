'use strict'

import { newBitsTrigger } from "../../common/commands"
import { logger } from "../../common/fn"
import TwitchClientManager from "../../net/TwitchClientManager"
import { RawCommand, TwitchChatContext } from "../../types"

const log = logger('CheerEventHandler.ts')

export class CheerEventHandler {
  // TODO: use better type info
  async handle(
    tcm: TwitchClientManager,
    data: { subscription: any, event: any },
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
    }
    const trigger = newBitsTrigger()
    await tcm.executeMatchingCommands(rawCmd, target, context, trigger)
  }
}
