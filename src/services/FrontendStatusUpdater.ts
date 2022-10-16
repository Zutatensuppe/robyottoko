import { logger, MINUTE } from "../common/fn"
import { refreshExpiredTwitchChannelAccessToken } from "../oauth"
import { Bot } from "../types"
import { User } from "../repo/Users"

const log = logger('FrontendStatusUpdater.ts')

export class FrontendStatusUpdater {
  private users: User[] = []

  constructor(private bot: Bot) {
    // pass
  }

  addUser (user: User) {
    this.users.push(user)
  }

  async updateForUser (userId: number) {
    for (const user of this.users) {
      if (user.id === userId) {
        await this._doUpdateForUser(user)
        return
      }
    }
  }

  async _doUpdateForUser (user: User) {
    const client = this.bot.getUserTwitchClientManager(user).getHelixClient()
    if (!client) {
      return
    }

    // status for the user that should show in frontend
    // (eg. problems with their settings)
    // this only is relevant if the user is at the moment connected
    // to a websocket
    if (!this.bot.getWebSocketServer().isUserConnected(user.id)) {
      return
    }

    const problems = []
    if (this.bot.getConfig().bot.supportTwitchAccessTokens) {
      const result = await refreshExpiredTwitchChannelAccessToken(
        this.bot,
        user,
      )
      if (result.error) {
        log.error('Unable to validate or refresh OAuth token.')
        log.error(`user: ${user.name}, channel: ${user.twitch_login}, error: ${result.error}`)
        problems.push({
          message: 'access_token_invalid',
          details: {
            channel_name: user.twitch_login,
          },
        })
      } else if (result.refreshed) {
        const changedUser = await this.bot.getUsers().getById(user.id)
        if (changedUser) {
          this.bot.getEventHub().emit('access_token_refreshed', changedUser)
        } else {
          log.error(`oauth token refresh: user doesn't exist after saving it: ${user.id}`)
        }
      }
    }

    const data = { event: 'status', data: { problems } }
    this.bot.getWebSocketServer().notifyAll([user.id], 'core', data)
  }

  async _doUpdate (): Promise<void> {
    log.info('doing update')
    const updatePromises: Promise<void>[] = []
    for (const user of this.users) {
      updatePromises.push(this._doUpdateForUser(user))
    }
    await Promise.all(updatePromises)
    setTimeout(() => this._doUpdate(), 1 * MINUTE)
    log.info('done update')
  }

  start () {
    this._doUpdate()
  }
}
