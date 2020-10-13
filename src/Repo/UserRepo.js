class UserRepo {
  constructor(db) {
    this.db = db
  }
  all() {
    return this.db.getMany('user')
  }
  getById(id) {
    return this.db.get('user', {id})
  }
}

module.exports = {
  UserRepo,
}