import { NextFunction, Response } from "express"
import { passwordHash } from "../fn"
import Tokens, { Token, TokenType } from "../services/Tokens"
import Users, { User } from "../services/Users"

class Auth {
  private userRepo: Users
  private tokenRepo: Tokens

  constructor(
    userRepo: Users,
    tokenRepo: Tokens,
  ) {
    this.userRepo = userRepo
    this.tokenRepo = tokenRepo
  }

  async getTokenInfoByTokenAndType(token: string, type: string): Promise<Token | null> {
    return await this.tokenRepo.getByTokenAndType(token, type)
  }

  async getUserById(id: number): Promise<User | null> {
    return await this.userRepo.get({ id, status: 'verified' })
  }

  async getUserByNameAndPass(name: string, plainPass: string): Promise<User | null> {
    const user = await this.userRepo.get({ name, status: 'verified' })
    if (!user || user.pass !== passwordHash(plainPass, user.salt)) {
      return null
    }
    return user
  }

  async getUserAuthToken(user_id: number): Promise<string> {
    return (await this.tokenRepo.generateAuthTokenForUserId(user_id)).token
  }

  async destroyToken(token: string): Promise<any> {
    return await this.tokenRepo.delete(token)
  }

  addAuthInfoMiddleware() {
    return async (req: any, _res: Response, next: NextFunction) => {
      const token = req.cookies['x-token'] || null
      const tokenInfo = await this.getTokenInfoByTokenAndType(token, TokenType.AUTH)
      if (tokenInfo) {
        const user = await this.userRepo.getById(tokenInfo.user_id)
        if (user) {
          req.token = tokenInfo.token
          req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status,
            groups: await this.userRepo.getGroups(user.id)
          }
        } else {
          req.token = null
          req.user = null
        }
      } else {
        req.token = null
        req.user = null
      }
      next()
    }
  }

  async userFromWidgetToken(token: string, type: string): Promise<User | null> {
    const tokenInfo = await this.getTokenInfoByTokenAndType(token, `widget_${type}`)
    if (tokenInfo) {
      return await this.getUserById(tokenInfo.user_id)
    }
    return null
  }

  async userFromPubToken(token: string): Promise<User | null> {
    const tokenInfo = await this.getTokenInfoByTokenAndType(token, TokenType.PUB)
    if (tokenInfo) {
      return await this.getUserById(tokenInfo.user_id)
    }
    return null
  }

  async wsTokenFromProtocol(protocol: string | string[], tokenType: string | null): Promise<Token | null> {
    let proto = Array.isArray(protocol) && protocol.length === 2
      ? protocol[1]
      : protocol
    if (Array.isArray(protocol) && protocol.length === 1) {
      proto = protocol[0]
    }
    if (Array.isArray(proto)) {
      return null
    }

    if (tokenType) {
      const tokenInfo = await this.getTokenInfoByTokenAndType(proto, tokenType)
      if (tokenInfo) {
        return tokenInfo
      }
      return null
    }

    let tokenInfo = await this.getTokenInfoByTokenAndType(proto, TokenType.AUTH)
    if (tokenInfo) {
      return tokenInfo
    }
    tokenInfo = await this.getTokenInfoByTokenAndType(proto, TokenType.PUB)
    if (tokenInfo) {
      return tokenInfo
    }
    return null
  }
}

export default Auth
