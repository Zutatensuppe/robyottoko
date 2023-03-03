'use strict'

import { logger } from '../common/fn'
import { WhereRaw } from '../DbPostgres'
import { Repo } from './Repo'

const TABLE = 'robyottoko.announcements'

const log = logger('CommandExecutionRepo.ts')

export interface AnnouncementsRow {
  id: number
  created: Date
  title: string
  message: string
}

export class AnnouncementRepo extends Repo {
  async getAll(): Promise<AnnouncementsRow[]> {
    return await this.db.getMany(TABLE, undefined, [{ created: -1 }])
  }

  async insert(announcement: Partial<AnnouncementsRow>): Promise<number | bigint> {
    return await this.db.insert(TABLE, announcement, 'id')
  }

  async get(where: WhereRaw): Promise<AnnouncementsRow | null> {
    return await this.db.get(TABLE, where)
  }
}
