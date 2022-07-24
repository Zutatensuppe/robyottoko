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
    const stream = await bot.getDb().get('robyottoko.streams', {
      broadcaster_user_id: data.event.broadcaster_user_id,
    }, [{ started_at: -1 }])
    if (stream) {
      if (!stream.ended_at) {
        await bot.getDb().update('robyottoko.streams', {
          ended_at: new Date(),
        }, { id: stream.id })
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
