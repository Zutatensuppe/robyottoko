class UserRepo {
  constructor(db) {
    this.db = db
    this.table = 'user'
  }
  all() {
    return this.db.getMany(this.table)
  }
  getById(id) {
    return this.db.get(this.table, {id})
  }
  getByNameAndPass(name, pass) {
    return this.db.get(this.table, {name, pass})
  }
}

module.exports = {
  UserRepo,
}