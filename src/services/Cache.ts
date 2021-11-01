import Db from "../Db"

const TABLE = 'cache'

class Cache {
  private db: Db

  constructor(db: Db) {
    this.db = db
  }
  set(key: string, value: any) {
    this.db.upsert(TABLE, { key, value: JSON.stringify(value) }, { key })
  }

  get(key: string): any {
    const row = this.db.get(TABLE, { key })
    return row ? JSON.parse(row.value) : null
  }
}

export default Cache
