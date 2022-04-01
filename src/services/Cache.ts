import Db from "../DbPostgres"
import { CacheValue } from "../types"

const TABLE = 'cache'

class Cache {
  private db: Db

  constructor(db: Db) {
    this.db = db
  }

  async set(key: string, value: CacheValue): Promise<void> {
    await this.db.upsert(TABLE, { key, value: JSON.stringify(value) }, { key })
  }

  async get(key: string): Promise<CacheValue> {
    const row = await this.db.get(TABLE, { key })
    return row ? JSON.parse(row.value) : null
  }
}

export default Cache
