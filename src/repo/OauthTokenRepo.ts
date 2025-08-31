'use strict'

import type { JSONDateString } from '../types'
import { Repo } from './Repo'
import type { User } from './Users'

const TABLE = 'robyottoko.oauth_token'

interface Row {
  access_token: string
  refresh_token: string
  scope: string
  token_type: string
  user_id: number
  channel_id: string
  expires_at: JSONDateString
}

export class OauthTokenRepo extends Repo {

  // get the newest access token (even if it is already expired)
  async getMatchingAccessToken (
    user: User,
  ): Promise<string | null> {
    const row = await this.getMatchingRow(user)
    return row ? row.access_token : null
  }

  // get the newest row (even if it is already expired)
  async getMatchingRow (
    user: User,
  ): Promise<Row | null> {
    return await this.db.get<Row>(TABLE, {
      user_id: user.id,
      channel_id: user.twitch_id,
    }, [{ expires_at: -1 }])
  }

  async getByAccessToken(accessToken: string): Promise<Row | null> {
    return await this.db.get<Row>(TABLE, { access_token: accessToken })
  }

  async insert(row: Row): Promise<void> {
    await this.db.insert(TABLE, row)
  }
}
