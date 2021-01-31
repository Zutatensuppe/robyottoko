const TABLE = 'token'

function generateToken(length) {
  // edit the token allowed characters
  const a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');
  const b = [];
  for (let i = 0; i < length; i++) {
    const j = (Math.random() * (a.length - 1)).toFixed(0);
    b[i] = a[j];
  }
  return b.join('');
}

class TokenRepo {
  constructor(db) {
    this.db = db
  }

  getByToken(token) {
    return this.db.get(TABLE, {token})
  }

  getByUserIdAndType(user_id, type) {
    return this.db.get(TABLE, {user_id, type})
  }

  delete(token) {
    this.db.delete(TABLE, {token})
  }

  insert(tokenInfo){
    this.db.insert(TABLE, tokenInfo)
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
    const token = generateToken(32)
    this.insert({user_id, type, token})
    return token
  }
}

module.exports = TokenRepo
