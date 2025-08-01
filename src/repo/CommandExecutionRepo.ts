'use strict'

import { logger } from '../common/fn'
import type { JSONDateString } from '../types'
import { Repo } from './Repo'

const TABLE = 'robyottoko.command_execution'

const log = logger('CommandExecutionRepo.ts')

export interface Row {
  command_id: string
  executed_at: JSONDateString
  trigger_user_name: string | null
}

export class CommandExecutionRepo extends Repo {
  async insert(data: Row): Promise<number | bigint> {
    return await this.db.insert(TABLE, data)
  }

  async getLastExecuted(data: {
    command_id: string,
    trigger_user_name?: string | null,
  }): Promise<Row | null> {
    return await this.db.get(TABLE, data, [
      { executed_at: -1 },
    ])
  }
}
