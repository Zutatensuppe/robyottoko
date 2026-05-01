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
  refresh_failures: number
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

  async insert(row: Omit<Row, 'refresh_failures'>): Promise<void> {
    await this.db.upsert(TABLE, row, { user_id: row.user_id })
  }

  async setRefreshFailures(accessToken: string, failures: number): Promise<void> {
    await this.db.update(TABLE, { refresh_failures: failures }, { access_token: accessToken })
  }

  async resetRefreshFailuresForUser(user: User): Promise<void> {
    const row = await this.getMatchingRow(user)
    if (row) {
      await this.setRefreshFailures(row.access_token, 0)
    }
  }

}
