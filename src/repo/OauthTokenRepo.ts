'use strict'

import { Repo } from './Repo'
import { User } from './Users'

const TABLE = 'robyottoko.oauth_token'

interface Row {
  access_token: string
  refresh_token: string
  scope: string
  token_type: string
  user_id: number
  channel_id: string
}

interface RowIn extends Row {
  expires_at: Date
}

interface RowOut extends Row {
  expires_at: string // json date
}

export class OauthTokenRepo extends Repo {

  // get the newest access token (even if it is already expired)
  async getMatchingAccessToken (
    user: User,
  ): Promise<string | null> {
    const row = await this.db.get<RowOut>(TABLE, {
      user_id: user.id,
      channel_id: user.twitch_id,
    }, [{ expires_at: -1 }])
    return row ? row.access_token : null
  }

  async getByAccessToken(accessToken: string): Promise<RowOut | null> {
    return await this.db.get<RowOut>(TABLE, { access_token: accessToken })
  }

  async insert(row: RowIn): Promise<void> {
    await this.db.insert(TABLE, row)
  }
}
