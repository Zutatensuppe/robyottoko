import Db from "../DbPostgres"

const TABLE = 'robyottoko.token'

export enum TokenType {
  API_KEY = 'api_key',
  AUTH = 'auth',
  PASSWORD_RESET = 'password_reset',
  PUB = 'pub',
  REGISTRATION = 'registration',
}

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

  async getByUserIdAndType(user_id: number, type: string): Promise<Token> {
    return await this.db.get(TABLE, { user_id, type })
  }

  async insert(tokenInfo: UpdateToken): Promise<number | bigint> {
    return await this.db.insert(TABLE, tokenInfo)
  }

  async createToken(user_id: number, type: string): Promise<Token> {
    const token = generateToken(32)
    const tokenObj: Token = { user_id, type, token }
    await this.insert(tokenObj)
    return tokenObj
  }

  async getOrCreateToken(user_id: number, type: string): Promise<Token> {
    return (await this.getByUserIdAndType(user_id, type))
      || (await this.createToken(user_id, type))
  }

  async getByTokenAndType(token: string, type: string): Promise<Token | null> {
    return (await this.db.get(TABLE, { token, type })) || null
  }

  async delete(token: string): Promise<any> {
    return await this.db.delete(TABLE, { token })
  }

  async generateAuthTokenForUserId(user_id: number): Promise<Token> {
    return await this.createToken(user_id, TokenType.AUTH)
  }
}

export default Tokens
