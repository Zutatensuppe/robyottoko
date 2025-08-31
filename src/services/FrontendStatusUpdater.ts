import { logger } from '../common/fn'
import type { Bot } from '../types'
import type { User } from '../repo/Users'

const log = logger('FrontendStatusUpdater.ts')

export class FrontendStatusUpdater {
  private users: User[] = []

  constructor(private bot: Bot) {
    // pass
  }

  public addUser(user: User) {
    this.users.push(user)
  }

  public async updateForUser(userId: number): Promise<void> {
    for (const user of this.users) {
      if (user.id === userId) {
        await this._doUpdateForUser(user)
        return
      }
    }
  }

  private async _doUpdateForUser(user: User): Promise<void> {
    const problems = await this.bot.getAccessTokenUpdater().doUpdateForUser(user)
    const data = { event: 'status', data: { problems } }
    this.bot.getWebSocketServer().notifyAll([user.id], 'core', data)
  }

  public async doUpdateForAllUsers(): Promise<void> {
    log.info(`doing update for ${this.users.length} users`)
    const updatePromises: Promise<void>[] = []
    for (const user of this.users) {
      updatePromises.push(this._doUpdateForUser(user))
    }
    await Promise.all(updatePromises)
    log.info(`done update for ${this.users.length} users`)
  }
}
