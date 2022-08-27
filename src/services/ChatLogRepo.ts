'use strict'

import Db, { WhereRaw } from "../DbPostgres"
import { TwitchChatContext } from "../types"

const TABLE = 'robyottoko.chat_log'

export class ChatLogRepo {
  constructor(private readonly db: Db) {
  }

  async insert(context: TwitchChatContext, msg: string) {
    await this.db.insert(TABLE, {
      created_at: new Date(),
      broadcaster_user_id: context['room-id'],
      user_name: context.username,
      display_name: context['display-name'],
      message: msg,
    })
  }

  async count(where: WhereRaw): Promise<number> {
    const whereObject = this.db._buildWhere(where)
    const row = await this.db._get(
      `select COUNT(*) as c from ${TABLE} ${whereObject.sql}`,
      whereObject.values
    )
    return parseInt(`${row.c}`, 10)
  }

  async isFirstChatAllTime(context: TwitchChatContext): Promise<boolean> {
    return await this.count({
      broadcaster_user_id: context['room-id'],
      user_name: context.username,
    }) === 1
  }

  async isFirstChatSince(context: TwitchChatContext, date: Date): Promise<boolean> {
    return await this.count({
      broadcaster_user_id: context['room-id'],
      user_name: context.username,
      created_at: { '$gte': date },
    }) === 1
  }

  // HACK: we have no other way of getting a user name by user display name atm
  // TODO: replace this functionality
  async getUsernameByUserDisplayName(displayName: string): Promise<string | null> {
    const row = await this.db.get(TABLE, {
      display_name: displayName,
    })
    return row ? row.user_name : null
  }
}
