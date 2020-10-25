class TokenRepo {
  constructor(db) {
    this.db = db
    this.table = 'token'
  }

  getByToken(token) {
    return this.db.get(this.table, {token})
  }

  getByUserIdAndType(user_id, type) {
    return this.db.get(this.table, {user_id, type})
  }

  delete(token) {
    this.db.delete(this.table, {token})
  }

  insert(tokenInfo){
    this.db.insert(this.table, tokenInfo)
  }

  generateToken(length) {
    // edit the token allowed characters
    const a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');
    const b = [];
    for (let i = 0; i < length; i++) {
      const j = (Math.random() * (a.length - 1)).toFixed(0);
      b[i] = a[j];
    }
    return b.join('');
  }

  getWidgetTokenForUserId(user_id) {
    const type = 'widget'
    return this.getByUserIdAndType(user_id, type)
      || this.createToken(user_id, type)
  }

  generateAuthTokenForUserId(user_id) {
    return this.createToken(user_id, 'auth')
  }

  createToken (user_id, type) {
    const token = this.generateToken(32)
    this.insert({user_id, type, token})
    return token
  }
}

module.exports = TokenRepo
