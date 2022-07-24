'use strict'

import { Bot } from "../../types";

export class StreamOnlineEventHandler {
  async handle(
    bot: Bot,
    data: { subscription: any, event: any },
  ) {
    // insert new stream
    await bot.getDb().insert('robyottoko.streams', {
      broadcaster_user_id: data.event.broadcaster_user_id,
      started_at: new Date(data.event.started_at),
    })
  }
}
