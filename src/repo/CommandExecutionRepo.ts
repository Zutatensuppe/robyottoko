'use strict'

import { logger } from '../common/fn'
import { Repo } from './Repo'

const TABLE = 'robyottoko.command_execution'

const log = logger('CommandExecutionRepo.ts')

export interface Row {
  command_id: string
  executed_at: string // json date
  trigger_user_name: string | null
}

export class CommandExecutionRepo extends Repo {
  async insert(data: {
    command_id: string,
    executed_at: Date,
    trigger_user_name: string | null,
  }): Promise<number | bigint> {
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
