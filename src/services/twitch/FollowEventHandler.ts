'use strict'

import { newFollowTrigger } from "../../common/commands"
import { logger } from "../../common/fn"
import TwitchClientManager from "../../net/TwitchClientManager"
import { RawCommand, TwitchChatContext } from "../../types"

const log = logger('FollowEventHandler.ts')

export class FollowEventHandler {
  // TODO: use better type info
  async handle(
    tcm: TwitchClientManager,
    data: { subscription: any, event: any },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: 'channel.follow',
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
    const trigger = newFollowTrigger()
    await tcm.executeMatchingCommands(rawCmd, target, context, trigger)
  }
}
