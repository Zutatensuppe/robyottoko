import Db from '../DbPostgres'
import { logger } from '../common/fn'

const log = logger('ModuleStorage.ts')

const TABLE = 'module'

class ModuleStorage {
  private db: Db
  private userId: number

  constructor(db: Db, userId: number) {
    this.db = db
    this.userId = userId
  }

  async load(key: string, def: Record<string, any>): Promise<Record<string, any>> {
    try {
      const where = { user_id: this.userId, key }
      const row = await this.db.get(TABLE, where)
      const data = row ? JSON.parse('' + row.data) : null
      return data ? Object.assign({}, def, data) : def
    } catch (e) {
      log.error(e)
      return def
    }
  }

  async save(key: string, rawData: Record<string, any>): Promise<void> {
    const where = { user_id: this.userId, key }
    const data = JSON.stringify(rawData)
    const dbData = Object.assign({}, where, { data })
    await this.db.upsert(TABLE, dbData, where)
  }
}

export default ModuleStorage
