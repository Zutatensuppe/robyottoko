import { MINUTE } from '../common/fn'
import { Worker } from './Worker'

export default class AccessTokenUpdaterWorker extends Worker {
  async work(): Promise<{ nextExecution?: number }> {
    await this.bot.getAccessTokenUpdater().doUpdateForAllUsers()
    return { nextExecution: 5 * MINUTE }
  }
}
