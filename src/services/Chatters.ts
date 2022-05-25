'use strict'

import Db from '../DbPostgres'

export const getChatters = async (db: Db, channelId: string, since: Date): Promise<string[]> => {
  const whereObject = db._buildWhere({
    broadcaster_user_id: channelId,
    created_at: { '$gte': since },
  })
  return (await db._getMany(
    `select display_name from robyottoko.chat_log ${whereObject.sql} group by display_name`,
    whereObject.values
  )).map(r => r.display_name)
}
