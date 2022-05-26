import Db from "../DbPostgres"
import { CacheValue } from "../types"
import { logger } from "../common/fn"

const TABLE = 'robyottoko.cache'

const log = logger('Cache.ts')

class Cache {
  private db: Db

  constructor(db: Db) {
    this.db = db
  }

  async set(key: string, value: CacheValue, lifetime: number): Promise<void> {
    if (value === undefined) {
      log.error(`unable to store undefined value for cache key: ${key}`)
      return
    }
    const expiresAt = lifetime === Infinity ? null : (new Date(new Date().getTime() + lifetime))
    const valueStr = JSON.stringify(value)
    await this.db.upsert(TABLE, { key, value: valueStr, expires_at: expiresAt }, { key })
  }

  async get(key: string): Promise<CacheValue | undefined> {
    // get *non-expired* cache entry from db
    const row = await this.db._get(
      'SELECT * from robyottoko.cache WHERE key = $1 AND (expires_at IS NULL OR expires_at > $2)',
      [key, new Date()]
    )
    return row ? JSON.parse(row.value) : undefined
  }
}

export default Cache
