class Cache {
  constructor(db) {
    this.db = db
    this.table = 'cache'
  }
  set (key, value) {
    this.db.upsert(this.table, {key, value: JSON.stringify(value)}, {key})
  }
  get (key) {
    const row = this.db.get(this.table, {key})
    return row ? JSON.parse(row.value) : null
  }
}

module.exports = {
  Cache,
}
