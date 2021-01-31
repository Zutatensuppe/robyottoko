const TABLE = 'user'

class UserRepo {
  constructor(db) {
    this.db = db
  }
  all() {
    return this.db.getMany(TABLE)
  }
  getById(id) {
    return this.db.get(TABLE, {id})
  }
  getByNameAndPass(name, pass) {
    return this.db.get(TABLE, {name, pass})
  }
}

module.exports = UserRepo
