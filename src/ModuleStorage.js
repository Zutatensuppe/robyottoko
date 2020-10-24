class ModuleStorage {
  constructor(db, user_id, key) {
    this.db = db
    this.table = 'module'
    this.where = { user_id, key }
  }
  load (def) {
    try {
      const row = this.db.get(this.table, this.where)
      const data = row ? JSON.parse('' + row.data) : null
      return data ? Object.assign({}, def, data) : def
    } catch (e) {
      console.log(e)
      return def
    }
  }
  save (rawData) {
    const data = JSON.stringify(rawData)
    const dbData = Object.assign({}, this.where, {data})
    this.db.upsert(this.table, dbData, this.where)
  }
}

module.exports = {
  ModuleStorage,
}