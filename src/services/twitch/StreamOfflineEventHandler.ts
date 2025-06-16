'use strict'

import { logger } from '../../common/fn'
import type { User } from '../../repo/Users'
import type { Bot } from '../../types'
import type { Subscription } from './EventSub'
import { EventSubEventHandler } from './EventSubEventHandler'

const log = logger('StreamOfflineEventHandler.ts')

interface StreamOfflineEvent {
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
}

export class StreamOfflineEventHandler extends EventSubEventHandler<StreamOfflineEvent> {
  async handle(
    bot: Bot,
    _user: User,
    data: { subscription: Subscription, event: StreamOfflineEvent },
  ) {
    log.info('handle')
    // get last started stream for broadcaster
    // if it exists and it didnt end yet set ended_at date
    const stream = await bot.getRepos().streams.getLatestByChannelId(data.event.broadcaster_user_id)
    if (stream) {
      if (!stream.ended_at) {
        await bot.getRepos().streams.setEndDate(`${stream.id}`, new Date())
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
