'use strict'

import { logger } from "../common/fn"
import { Repo } from "./Repo"

const TABLE = 'robyottoko.module'

const log = logger('ModuleRepo.ts')

interface Row {
  user_id: number
  key: string
  data: string
  enabled: boolean
}

export class ModuleRepo extends Repo {
  async load(userId: number, key: string, def: Record<string, any>): Promise<{ data: Record<string, any>, enabled: boolean }> {
    try {
      const where = { user_id: userId, key }
      let row = await this.db.get<Row>(TABLE, where)
      if (!row) {
        await this.save(userId, key, def)
      }
      row = await this.db.get<Row>(TABLE, where) as Row
      const data = JSON.parse('' + row.data)
      return {
        data: data ? Object.assign({}, def, data) : def,
        enabled: row ? !!row.enabled : true,
      }
    } catch (e) {
      log.error({ e })
      return {
        data: def,
        enabled: true,
      }
    }
  }

  async getInfosByUser(userId: number): Promise<{key: string, enabled: boolean}[]> {
    const sql = 'SELECT key, enabled FROM ' + TABLE + ' WHERE user_id = $1';
    return await this.db._getMany(sql, [userId])
  }

  async save(userId: number, key: string, rawData: Record<string, any>): Promise<void> {
    const where = { user_id: userId, key }
    const data = JSON.stringify(rawData)
    const dbData = Object.assign({}, where, { data })
    await this.db.upsert(TABLE, dbData, where)
  }

  async setEnabled(userId: number, key: string, enabled: boolean): Promise<void> {
    const where = { user_id: userId, key }
    await this.db.update(TABLE, { enabled }, where)
  }
}
