import { logger, MINUTE } from '../common/fn'
import type { Bot } from '../types'
import type { User } from '../repo/Users'
import type { TwitchHelixClient } from './TwitchHelixClient'

const log = logger('AccessTokenUpdater.ts')

interface TokenRefreshResult {
  error: false | string
  refreshed: boolean
}

export class AccessTokenUpdater {
  constructor(private bot: Bot) {
    // pass
  }

  public async doUpdateForUser(
    user: User,
  ): Promise<{ message: string, details: { channel_name: string } }[]> {
    if (!this.bot.getConfig().bot.supportTwitchAccessTokens) {
      return []
    }
    const client = this.bot.getUserTwitchClientManager(user).getHelixClient()
    if (!client) {
      return []
    }

    const accessToken = await this.bot.getRepos().oauthToken.getMatchingAccessToken(user)
    if (!accessToken) {
      return []
    }

    const result = await this.refreshExpiredTwitchChannelAccessToken(
      this.bot,
      client,
      user,
      accessToken,
    )

    if (result.error) {
      log.error('Unable to validate or refresh OAuth token.')
      log.error(`user: ${user.name}, channel: ${user.twitch_login}, error: ${result.error}`)

      return [{
        message: 'access_token_invalid',
        details: {
          channel_name: user.twitch_login,
        },
      }]
    }

    if (result.refreshed) {
      const changedUser = await this.bot.getRepos().user.getById(user.id)
      if (changedUser) {
        this.bot.getEventHub().emit('access_token_refreshed', changedUser)
      } else {
        log.error(`oauth token refresh: user doesn't exist after saving it: ${user.id}`)
      }
    }

    return []
  }

  private async refreshExpiredTwitchChannelAccessToken(
    bot: Bot,
    client: TwitchHelixClient,
    user: User,
    accessToken: string,
  ): Promise<TokenRefreshResult> {
    let channelId = user.twitch_id
    if (!channelId) {
      channelId = await client.getUserIdByNameCached(user.twitch_login, bot.getCache())
      if (!channelId) {
        return { error: false, refreshed: false }
      }
    }

    const resp = await client.validateOAuthToken(channelId, accessToken)
    if (resp.valid) {
      return { error: false, refreshed: false }
    }

    const result = await client.tryRefreshAccessToken(accessToken, bot, user.id, channelId)
    if ('token' in result) {
      return { error: false, refreshed: true }
    }

    return { error: result.error, refreshed: false }
  }

  public async doUpdateForAllUsers(): Promise<void> {
    // get all users that dont have a valid token
    // from those users get all that have a refresh token
    // (later we might add a counter of how many times the
    // refresh failed and give up after a while)
    const users = await this.bot.getRepos().user.all()

    // we check if the token will expire in the next X,
    // in order to always have a valid token, and not only refresh
    // when it is already expired
    // We pick the magic number 30 minutes here for no specific reason.
    // However, it is picked to be > 5, as the cronjob to renew access tokens
    // is set to run every 5 minutes
    // It means: If the token expires in less than 30 minutes, we refresh
    // it now already.
    const expireCheckDate = Date.now() + 30 * MINUTE
    for (const user of users) {
      const row = await this.bot.getRepos().oauthToken.getMatchingRow(user)
      if (!row) {
        continue
      }
      if (expireCheckDate > new Date(row.expires_at).getTime()) {
        // discarding result here when doing update for all users
        await this.doUpdateForUser(user)
      }
    }
  }
}
