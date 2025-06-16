import jwt from 'jsonwebtoken'
import type { User } from '../repo/Users'
import type { CannyConfig } from '../types'

export class Canny {
  constructor(private config: CannyConfig) {
    // pass
  }

  createToken(user: User): string {
    const userData = {
      email: user.email,
      id: user.id,
      name: user.name,
    }
    return jwt.sign(userData, this.config.sso_private_key, { algorithm: 'HS256' })
  }
}
