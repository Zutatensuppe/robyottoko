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

function Tokens(db) {
  const getByUserIdAndType = (user_id, type) => db.get(TABLE, {user_id, type})
  const insert = (tokenInfo) => db.insert(TABLE, tokenInfo)
  const createToken = (user_id, type) => {
    const token = generateToken(32)
    insert({user_id, type, token})
    return token
  }

  return {
    getByToken: (token) => db.get(TABLE, {token}),
    delete: (token) => db.delete(TABLE, {token}),
    getWidgetTokenForUserId: (user_id) => {
      const type = 'widget'
      return getByUserIdAndType(user_id, type)
        || createToken(user_id, type)
    },
    generateAuthTokenForUserId: (user_id) => createToken(user_id, 'auth'),
  }
}

module.exports = Tokens