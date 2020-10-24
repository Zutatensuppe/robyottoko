class Auth
{
  constructor(userRepo, tokenRepo) {
    this.userRepo = userRepo
    this.tokenRepo = tokenRepo
  }

  getUserForNameAndPass (name, pass) {
    return this.userRepo.getByNameAndPass(name, pass)
  }

  getUserAuthToken (user_id) {
    return this.tokenRepo.generateAuthTokenForUserId(user_id)
  }

  getTokenInfo (token) {
    return this.tokenRepo.getByToken(token)
  }

  getUserByToken (token) {
    const tokenInfo = this.getTokenInfo(token)
    return this.userRepo.getById(tokenInfo.user_id)
  }

  checkToken (token, type) {
    return !!this.tokenRepo.getByTokenAndType(token, type)
  }

  destroyToken (token) {
    this.tokenRepo.delete(token)
  }

  addAuthInfoMiddleware () {
    return (req, res, next) => {
      const token = req.cookies['x-token'] || null
      const tokenInfo = this.tokenRepo.getByTokenAndType(token, 'auth')
      if (tokenInfo) {
        req.token = tokenInfo.token
        req.user = this.userRepo.getById(tokenInfo.user_id)
        req.userWidgetToken = this.tokenRepo.getWidgetTokenForUserId(tokenInfo.user_id).token
      } else {
        req.token = null
        req.user = null
      }
      next()
    }
  }

  wsTokenFromProtocol (protocol) {
    let proto = Array.isArray(protocol) && protocol.length === 2
      ? protocol[1]
      : protocol
    if (Array.isArray(protocol) && protocol.length === 1) {
      proto = protocol[0]
    }
    const tokenInfo = this.getTokenInfo(proto)
    if (tokenInfo && ['auth', 'widget'].includes(tokenInfo.type)) {
      return tokenInfo
    }
    return null
  }
}

module.exports = {
  Auth,
}