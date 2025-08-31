import type { Bot } from '../types'
import FrontendStatusUpdaterWorker from './FrontendStatusUpdaterWorker'
import AccessTokenUpdaterWorker from './AccessTokenUpdaterWorker'
import StreamStatusUpdaterWorker from './StreamStatusUpdaterWorker'

export class Workers {
  private _frontendStatusUpdaterWorker!: FrontendStatusUpdaterWorker
  private _streamStatusUpdaterWorker!: StreamStatusUpdaterWorker
  private _accessTokenUpdaterWorker!: AccessTokenUpdaterWorker

  public init(bot: Bot): void{
    this._frontendStatusUpdaterWorker = new FrontendStatusUpdaterWorker(bot)
    this._streamStatusUpdaterWorker = new StreamStatusUpdaterWorker(bot)
    this._accessTokenUpdaterWorker = new AccessTokenUpdaterWorker(bot)
  }

  public runAll(): void {
    void this._frontendStatusUpdaterWorker.run()
    void this._streamStatusUpdaterWorker.run()
    void this._accessTokenUpdaterWorker.run()
  }
}
