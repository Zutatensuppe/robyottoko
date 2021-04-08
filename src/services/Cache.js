const TABLE = 'cache'

class Cache {
  constructor(db) {
    this.db = db
  }
  set (key, value) {
    this.db.upsert(TABLE, {key, value: JSON.stringify(value)}, {key})
  }
  get (key) {
    const row = this.db.get(TABLE, {key})
    return row ? JSON.parse(row.value) : null
  }
}

module.exports = Cache
