const log = (...args) => console.log('[ModuleStorage.js]', ...args)

class ModuleStorage {
  constructor(db, userId) {
    this.db = db
    this.table = 'module'
    this.userId = userId
  }
  load (key, def) {
    try {
      const where = { user_id: this.userId, key }
      const row = this.db.get(this.table, where)
      const data = row ? JSON.parse('' + row.data) : null
      return data ? Object.assign({}, def, data) : def
    } catch (e) {
      log(e)
      return def
    }
  }
  save (key, rawData) {
    const where = { user_id: this.userId, key }
    const data = JSON.stringify(rawData)
    const dbData = Object.assign({}, where, {data})
    this.db.upsert(this.table, dbData, where)
  }
}

module.exports = ModuleStorage
