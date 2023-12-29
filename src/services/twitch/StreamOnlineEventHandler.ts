'use strict'

import { logger } from '../../common/fn'
import { User } from '../../repo/Users'
import { Bot } from '../../types'
import { Subscription } from './EventSub'
import { EventSubEventHandler } from './EventSubEventHandler'

const log = logger('StreamOnlineEventHandler.ts')

interface StreamOnlineEvent {
  id: string
  broadcaster_user_id: string
  broadcaster_user_login: string
  broadcaster_user_name: string
  type: string
  started_at: string // json date string
}

export class StreamOnlineEventHandler extends EventSubEventHandler<StreamOnlineEvent> {
  async handle(
    bot: Bot,
    _user: User,
    data: { subscription: Subscription, event: StreamOnlineEvent },
  ) {
    log.info('handle')

    await bot.getRepos().streams.insert({
      broadcaster_user_id: data.event.broadcaster_user_id,
      started_at: new Date(data.event.started_at),
    })
  }
}
