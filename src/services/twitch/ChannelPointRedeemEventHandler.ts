'use strict'

import { newRewardRedemptionTrigger } from "../../common/commands"
import { logger } from "../../common/fn"
import TwitchClientManager from "../../net/TwitchClientManager"
import { RawCommand, TwitchChatContext } from "../../types"

const log = logger('ChannelPointRedeemEventHandler.ts')

export class ChannelPointRedeemEventHandler {
  async handle(
    tcm: TwitchClientManager,
    data: { subscription: any, event: any },
  ): Promise<void> {
    log.info('handle')
    const rawCmd: RawCommand = {
      name: data.event.reward.title,
      args: data.event.user_input ? [data.event.user_input] : [],
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
    const trigger = newRewardRedemptionTrigger(data.event.reward.title)
    await tcm.executeMatchingCommands(rawCmd, target, context, trigger)
  }
}
