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
    if (!client) {
      return
    }

    const twitchChannels = await this.bot.getTwitchChannels().allByUserId(user.id)
    for (const twitchChannel of twitchChannels) {
      if (!twitchChannel.channel_id) {
        const channelId = await client.getUserIdByNameCached(twitchChannel.channel_name, this.bot.getCache())
        if (!channelId) {
          continue
        }
        twitchChannel.channel_id = channelId
      }
      const stream = await client.getStreamByUserId(twitchChannel.channel_id)
      twitchChannel.is_streaming = !!stream
      this.bot.getTwitchChannels().save(twitchChannel)
    }
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
