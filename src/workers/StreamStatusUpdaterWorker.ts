import { MINUTE } from '../common/fn'
import { Worker } from './Worker'

export default class StreamStatusUpdaterWorker extends Worker {
  async work(): Promise<{ nextExecution?: number }> {
    await this.bot.getStreamStatusUpdater().doUpdateForAllUsers()
    return { nextExecution: 5 * MINUTE }
  }
}
