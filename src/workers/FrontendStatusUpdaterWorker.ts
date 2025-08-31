import { MINUTE } from '../common/fn'
import { Worker } from './Worker'

export default class FrontendStatusUpdaterWorker extends Worker {
  async work(): Promise<{ nextExecution?: number }> {
    await this.bot.getFrontendStatusUpdater().doUpdateForAllUsers()
    return { nextExecution: 1 * MINUTE }
  }
}
