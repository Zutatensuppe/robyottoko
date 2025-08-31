import { MINUTE } from '../common/fn'
import type { Bot } from '../types'

export abstract class Worker {
  private timeout: any = null
  private boundRun: () => Promise<void>

  constructor(
    protected readonly bot: Bot,
  ) {
    this.boundRun = this.run.bind(this)
  }

  protected abstract work(): Promise<{ nextExecution?: number }>

  public async run(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    try {
      const result = await this.work()
      if (result.nextExecution) {
        this.timeout = setTimeout(this.boundRun, result.nextExecution)
      } else {
        this.timeout = null
      }
    } catch (err) {
      console.error(`[${this.constructor.name}] worker failed:`, err)
      this.timeout = setTimeout(this.boundRun, 1 * MINUTE) // retry in 1 min
    }
  }
}
