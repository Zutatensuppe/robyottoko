'use strict'

import { logger } from "../../common/fn";
import { Bot } from "../../types";

const log = logger('StreamOnlineEventHandler.ts')

export class StreamOnlineEventHandler {
  async handle(
    bot: Bot,
    data: { subscription: any, event: any },
  ) {
    log.info('handle')

    await bot.getRepos().streams.insert({
      broadcaster_user_id: data.event.broadcaster_user_id,
      started_at: new Date(data.event.started_at),
    })
  }
}
