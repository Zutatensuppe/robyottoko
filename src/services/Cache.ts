import Db from "../Db"
import { CacheValue } from "../types"

const TABLE = 'cache'

class Cache {
  private db: Db

  constructor(db: Db) {
    this.db = db
  }
  set(key: string, value: CacheValue) {
    this.db.upsert(TABLE, { key, value: JSON.stringify(value) }, { key })
  }

  get(key: string): CacheValue {
    const row = this.db.get(TABLE, { key })
    return row ? JSON.parse(row.value) : null
  }
}

export default Cache
