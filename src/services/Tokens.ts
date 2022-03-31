import Db from "../Db"

const TABLE = 'token'

export interface Token {
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

class Tokens {
  private db: Db

  constructor(db: Db) {
    this.db = db
  }

  getByUserIdAndType(user_id: number, type: string): Token {
    return this.db.get(TABLE, { user_id, type })
  }

  insert(tokenInfo: UpdateToken) {
    return this.db.insert(TABLE, tokenInfo)
  }

  createToken(user_id: number, type: string): Token {
    const token = generateToken(32)
    const tokenObj: Token = { user_id, type, token }
    this.insert(tokenObj)
    return tokenObj
  }

  getOrCreateToken(user_id: number, type: string): Token {
    return this.getByUserIdAndType(user_id, type) || this.createToken(user_id, type)
  }

  getByTokenAndType(token: string, type: string): Token | null {
    return this.db.get(TABLE, { token, type }) || null
  }

  delete(token: string) {
    return this.db.delete(TABLE, { token })
  }

  getWidgetTokenForUserId(user_id: number): Token {
    return this.getOrCreateToken(user_id, 'widget')
  }

  getPubTokenForUserId(user_id: number): Token {
    return this.getOrCreateToken(user_id, 'pub')
  }

  generateAuthTokenForUserId(user_id: number): Token {
    return this.createToken(user_id, 'auth')
  }
}

export default Tokens
