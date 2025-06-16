'use strict'

import type { WhereRaw } from '../DbPostgres'
import type { TwitchEventContext } from '../services/twitch'
import { Repo } from './Repo'

const TABLE = 'robyottoko.chat_log'

interface Row {
  broadcaster_user_id: string
  user_name: string
  display_name: string
  message: string
}

interface RowIn extends Row {
  created_at: Date
}

interface RowOut extends Row {
  created_at: string
}

export class ChatLogRepo extends Repo {
  async insert(context: TwitchEventContext, msg: string) {
    await this.db.insert<RowIn>(TABLE, {
      created_at: new Date(),
      broadcaster_user_id: context['room-id'] || '',
      user_name: context.username || '',
      display_name: context['display-name'] || '',
      message: msg,
    })
  }

  async count(where: WhereRaw): Promise<number> {
    const whereObject = this.db._buildWhere(where)
    const row = await this.db._get(
      `select COUNT(*) as c from ${TABLE} ${whereObject.sql}`,
      whereObject.values,
    )
    return parseInt(`${row.c}`, 10)
  }

  async isFirstChatAllTime(context: TwitchEventContext): Promise<boolean> {
    return await this.count({
      broadcaster_user_id: context['room-id'],
      user_name: context.username,
    }) === 1
  }

  async isFirstChatSince(context: TwitchEventContext, date: Date): Promise<boolean> {
    return await this.count({
      broadcaster_user_id: context['room-id'],
      user_name: context.username,
      created_at: { '$gte': date },
    }) === 1
  }

  // HACK: we have no other way of getting a user name by user display name atm
  // TODO: replace this functionality
  async getUsernameByUserDisplayName(displayName: string): Promise<string | null> {
    const row = await this.db.get<RowOut>(TABLE, {
      display_name: displayName,
    })
    return row ? row.user_name : null
  }

  async getChatters(channelId: string, since: Date): Promise<string[]> {
    const whereObject = this.db._buildWhere({
      broadcaster_user_id: channelId,
      created_at: { '$gte': since },
    })
    return (await this.db._getMany(
      `select display_name from robyottoko.chat_log ${whereObject.sql} group by display_name`,
      whereObject.values,
    )).map(r => r.display_name)
  }
}
