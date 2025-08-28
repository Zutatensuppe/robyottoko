import { logger, MINUTE } from '../common/fn'
import type { Bot } from '../types'
import type { User } from '../repo/Users'
import type { TwitchHelixClient } from './TwitchHelixClient'

const log = logger('FrontendStatusUpdater.ts')

interface TokenRefreshResult {
  error: false | string
  refreshed: boolean
}

export class FrontendStatusUpdater {
  private users: User[] = []

  constructor(private bot: Bot) {
    // pass
  }

  public addUser (user: User) {
    this.users.push(user)
  }

  public async updateForUser (userId: number) {
    for (const user of this.users) {
      if (user.id === userId) {
        await this._doUpdateForUser(user)
        return
      }
    }
  }

  private async _doUpdateForUser (user: User) {
    const problems = await this.getFrontendStatusProblems(user)
    const data = { event: 'status', data: { problems } }
    this.bot.getWebSocketServer().notifyAll([user.id], 'core', data)
  }

  private async _doUpdate (): Promise<void> {
    log.info('doing update')
    const updatePromises: Promise<void>[] = []
    for (const user of this.users) {
      updatePromises.push(this._doUpdateForUser(user))
    }
    await Promise.all(updatePromises)
    setTimeout(() => {
      void this._doUpdate()
    }, 1 * MINUTE)
    log.info('done update')
  }

  public start () {
    void this._doUpdate()
  }

  private async getFrontendStatusProblems (
    user: User,
  ): Promise<{ message: string, details: { channel_name: string }}[]> {
    const client = this.bot.getUserTwitchClientManager(user).getHelixClient()
    if (!client) {
      return []
    }

    // status for the user that should show in frontend
    // (eg. problems with their settings)
    // this only is relevant if the user is at the moment connected
    // to a websocket
    if (!this.bot.getWebSocketServer().isUserConnected(user.id)) {
      return []
    }

    if (!this.bot.getConfig().bot.supportTwitchAccessTokens) {
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

  private async refreshExpiredTwitchChannelAccessToken (
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
}
