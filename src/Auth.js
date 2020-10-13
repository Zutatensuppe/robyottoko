class Auth
{
  constructor(userRepo, tokenRepo) {
    this.userRepo = userRepo
    this.tokenRepo = tokenRepo
  }

  generateToken(length) {
    //edit the token allowed characters
    const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    const b = [];
    for (let i = 0; i < length; i++) {
      const j = (Math.random() * (a.length - 1)).toFixed(0);
      b[i] = a[j];
    }
    return b.join("");
  }

  generateTokenForUser (user_id, type) {
    const token = this.generateToken(32)
    this.tokenRepo.insert({
      user_id: user_id,
      type: type,
      token: token,
    })
    return token
  }

  checkUserPass (user, pass) {
    for (let u of this.userRepo.all()) {
      if (u.name === user && u.pass === pass) {
        return this.generateTokenForUser(u.id, 'auth')
      }
    }
    return null
  }

  getUserWidgetToken (user_id) {
    const tokens = this.tokenRepo.all()
    for (const token of tokens) {
      if (token.user_id === user_id && token.type === 'widget') {
        return token
      }
    }
    return this.generateTokenForUser(user_id, 'widget')
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
      if (this.checkToken(token, 'auth')) {
        req.token = token
        const tokenInfo = this.tokenRepo.getByToken(token)
        req.user = this.userRepo.getById(tokenInfo.user_id)
        req.userWidgetToken = this.getUserWidgetToken(tokenInfo.user_id).token
      } else {
        req.token = null
        req.user = null
      }
      next()
    }
  }

  wsHandleProtocol () {
    return (protocol) => {
      let proto = Array.isArray(protocol) && protocol.length === 2
        ? protocol[1]
        : protocol
      if (Array.isArray(protocol) && protocol.length === 1) {
        proto = protocol[0]
      }
      if (this.checkToken(proto, 'auth') || this.checkToken(proto, 'widget')) {
        return proto
      }
      return new Date().getTime()
    }
  }
}

module.exports = {
  Auth,
}