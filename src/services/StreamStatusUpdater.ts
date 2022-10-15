import { logger, MINUTE } from "../common/fn"
import { Bot } from "../types"
import { User } from "./Users"

const log = logger('StreamStatusUpdater.ts')

export class StreamStatusUpdater {
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
    if (!client || !user.twitch_id) {
      return
    }
    const stream = await client.getStreamByUserId(user.twitch_id)
    this.bot.getUsers().save({
      id: user.id,
      is_streaming: !!stream,
    })
  }

  async _doUpdate (): Promise<void> {
    log.info('doing update')
    const updatePromises: Promise<void>[] = []
    for (const user of this.users) {
      updatePromises.push(this._doUpdateForUser(user))
    }
    await Promise.all(updatePromises)
    setTimeout(() => this._doUpdate(), 5 * MINUTE)
    log.info('done update')
  }

  start () {
    this._doUpdate()
  }
}
