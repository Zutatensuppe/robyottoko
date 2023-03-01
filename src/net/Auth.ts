import { NextFunction, Response } from 'express'
import { Repos } from '../repo/Repos'
import { Token, TokenType } from '../repo/Tokens'
import { User } from '../repo/Users'
import { Canny } from '../services/Canny'
import { ApiUserData } from '../types'

class Auth {
  constructor(private readonly repos: Repos, private readonly canny: Canny) {
    // pass
  }

  async getTokenInfoByTokenAndType(token: string, type: string): Promise<Token | null> {
    return await this.repos.token.getByTokenAndType(token, type)
  }

  async _getUserById(id: number): Promise<User | null> {
    return await this.repos.user.getById(id)
  }

  async getUserAuthToken(user_id: number): Promise<string> {
    return (await this.repos.token.generateAuthTokenForUserId(user_id)).token
  }

  async destroyToken(token: string): Promise<any> {
    return await this.repos.token.delete(token)
  }

  async _determineApiUserData(token: string | null): Promise<ApiUserData | null> {
    if (token === null) {
      return null
    }
    const tokenInfo = await this.getTokenInfoByTokenAndType(token, TokenType.AUTH)
    if (!tokenInfo) {
      return null
    }

    const user = await this.repos.user.getById(tokenInfo.user_id)
    if (!user) {
      return null
    }

    return {
      token: tokenInfo.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        groups: await this.repos.user.getGroups(user.id),
      },
      cannyToken: this.canny.createToken(user),
    }
  }

  addAuthInfoMiddleware() {
    return async (req: any, _res: Response, next: NextFunction) => {
      const token = req.cookies['x-token'] || null
      const userData = await this._determineApiUserData(token)
      req.token = userData?.token || null
      req.user = userData?.user || null
      next()
    }
  }

  async userFromWidgetToken(token: string, type: string): Promise<User | null> {
    const tokenInfo = await this.getTokenInfoByTokenAndType(token, `widget_${type}`)
    if (tokenInfo) {
      return await this._getUserById(tokenInfo.user_id)
    }
    return null
  }

  async userFromPubToken(token: string): Promise<User | null> {
    const tokenInfo = await this.getTokenInfoByTokenAndType(token, TokenType.PUB)
    if (tokenInfo) {
      return await this._getUserById(tokenInfo.user_id)
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
