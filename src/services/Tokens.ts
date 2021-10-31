import Db from "../Db"

const TABLE = 'token'

interface Token {
  user_id: number
  type: string
  token: string
}

interface UpdateToken {
  user_id?: number
  type?: string
  token?: string
}

function generateToken(length: number): string {
  // edit the token allowed characters
  const a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('')
  const b = []
  for (let i = 0; i < length; i++) {
    const j = parseInt((Math.random() * (a.length - 1)).toFixed(0), 10)
    b[i] = a[j]
  }
  return b.join('')
}

function Tokens(db: Db) {
  const getByUserIdAndType = (user_id: number, type: string): Token => db.get(TABLE, { user_id, type })
  const insert = (tokenInfo: UpdateToken) => db.insert(TABLE, tokenInfo)
  const createToken = (user_id: number, type: string): Token => {
    const token = generateToken(32)
    const tokenObj: Token = { user_id, type, token }
    insert(tokenObj)
    return tokenObj
  }

  const getOrCreateToken = (user_id: number, type: string): Token => {
    return getByUserIdAndType(user_id, type) || createToken(user_id, type)
  }

  return {
    createToken,
    getByToken: (token: string): Token | null => db.get(TABLE, { token }) || null,
    delete: (token: string) => db.delete(TABLE, { token }),
    getWidgetTokenForUserId: (user_id: number): Token => getOrCreateToken(user_id, 'widget'),
    getPubTokenForUserId: (user_id: number): Token => getOrCreateToken(user_id, 'pub'),
    generateAuthTokenForUserId: (user_id: number): Token => createToken(user_id, 'auth'),
  }
}

export default Tokens
