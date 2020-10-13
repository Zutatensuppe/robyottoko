class ModuleStorage {
  constructor(db, user_id, module) {
    this.db = db
    this.user_id = user_id
    this.key = module
  }
  load (def) {
    try {
      const row = this.db.get('module', { user_id: this.user_id, key: this.key })
      const data = row ? JSON.parse('' + row.data) : null
      return data ? Object.assign({}, def, data) : def
    } catch (e) {
      console.log(e)
      return def
    }
  }
  save (data) {
    const dbData = {
      user_id: this.user_id,
      key: this.key,
      data: JSON.stringify(data),
    }
    this.db.upsert('module', dbData, { user_id: this.user_id, key: this.key })
  }
}

module.exports = {
  ModuleStorage,
}