class TokenRepo {
  constructor(db) {
    this.db = db
  }
  all() {
    return this.db.getMany('token')
  }
  getByToken(token) {
    return this.db.get('token', {token})
  }
  getByTokenAndType(token, type) {
    return this.db.get('token', {token, type})
  }
  delete(token) {
    this.db.delete('token', {token})
  }
  insert(tokenInfo){
    this.db.insert('token', tokenInfo)
  }
}

module.exports = {
  TokenRepo,
}