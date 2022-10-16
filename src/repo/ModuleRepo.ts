'use strict'

import { logger } from "../common/fn"
import { Repo } from "./Repo"

const TABLE = 'robyottoko.module'

const log = logger('ModuleRepo.ts')

interface Row {
  user_id: number
  key: string
  data: string
}

export class ModuleRepo extends Repo {
  async load(userId: number, key: string, def: Record<string, any>): Promise<Record<string, any>> {
    try {
      const where = { user_id: userId, key }
      const row = await this.db.get<Row>(TABLE, where)
      const data = row ? JSON.parse('' + row.data) : null
      return data ? Object.assign({}, def, data) : def
    } catch (e) {
      log.error({ e })
      return def
    }
  }

  async save(userId: number, key: string, rawData: Record<string, any>): Promise<void> {
    const where = { user_id: userId, key }
    const data = JSON.stringify(rawData)
    const dbData = Object.assign({}, where, { data })
    await this.db.upsert(TABLE, dbData, where)
  }
}
