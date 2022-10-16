'use strict'

import { logger } from "../../common/fn";
import { Bot } from "../../types";

const log = logger('StreamOfflineEventHandler.ts')

export class StreamOfflineEventHandler {
  async handle(
    bot: Bot,
    data: { subscription: any, event: any },
  ) {
    log.info('handle')
    // get last started stream for broadcaster
    // if it exists and it didnt end yet set ended_at date
    const stream = await bot.getStreamsRepo().getLatestByChannelId(data.event.broadcaster_user_id)
    if (stream) {
      if (!stream.ended_at) {
        await bot.getStreamsRepo().setEndDate(`${stream.id}`, new Date())
      } else {
        // stream end date is already set
      }
    } else {
      // note: we cannot enter the stream from just the stream.offline
      // event data, as it doesn't contain the start date of the stream
      // maybe we could fetch that information via api
    }
  }
}
