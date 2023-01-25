import jwt from 'jsonwebtoken'
import { User } from '../repo/Users';
import { CannyConfig } from '../types';

export class Canny {
  constructor(private config: CannyConfig) {
    // pass
  }

  createToken(user: User): string {
    const userData = {
      email: user.email,
      id: user.id,
      name: user.name,
    };
    return jwt.sign(userData, this.config.sso_private_key, { algorithm: 'HS256' })
  }
}
