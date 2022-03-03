import { NextFunction, Response } from "express"
import { passwordHash } from "../fn"
import Tokens from "../services/Tokens"
import Users from "../services/Users"

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

  getTokenInfo(token: string) {
    return this.tokenRepo.getByToken(token)
  }

  getUserById(id: number) {
    return this.userRepo.get({ id, status: 'verified' })
  }

  getUserByNameAndPass(name: string, plainPass: string) {
    const user = this.userRepo.get({ name, status: 'verified' })
    if (!user || user.pass !== passwordHash(plainPass, user.salt)) {
      return null
    }
    return user
  }

  getUserAuthToken(user_id: number) {
    return this.tokenRepo.generateAuthTokenForUserId(user_id).token
  }

  destroyToken(token: string) {
    return this.tokenRepo.delete(token)
  }

  addAuthInfoMiddleware() {
    return (req: any, _res: Response, next: NextFunction) => {
      const token = req.cookies['x-token'] || null
      const tokenInfo = this.getTokenInfo(token)
      if (tokenInfo && ['auth'].includes(tokenInfo.type)) {
        const user = this.userRepo.getById(tokenInfo.user_id)
        if (user) {
          req.token = tokenInfo.token
          req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status,
            groups: this.userRepo.getGroups(user.id)
          }
          req.userWidgetToken = this.tokenRepo.getWidgetTokenForUserId(tokenInfo.user_id).token
          req.userPubToken = this.tokenRepo.getPubTokenForUserId(tokenInfo.user_id).token
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

  userFromWidgetToken(token: string) {
    const tokenInfo = this.getTokenInfo(token)
    if (tokenInfo && ['widget'].includes(tokenInfo.type)) {
      return this.getUserById(tokenInfo.user_id)
    }
    return null
  }

  userFromPubToken(token: string) {
    const tokenInfo = this.getTokenInfo(token)
    if (tokenInfo && ['pub'].includes(tokenInfo.type)) {
      return this.getUserById(tokenInfo.user_id)
    }
    return null
  }

  wsTokenFromProtocol(protocol: string | string[]) {
    let proto = Array.isArray(protocol) && protocol.length === 2
      ? protocol[1]
      : protocol
    if (Array.isArray(protocol) && protocol.length === 1) {
      proto = protocol[0]
    }
    if (Array.isArray(proto)) {
      return null
    }
    const tokenInfo = this.getTokenInfo(proto)
    if (tokenInfo && ['auth', 'widget', 'pub'].includes(tokenInfo.type)) {
      return tokenInfo
    }
    return null
  }
}

export default Auth
