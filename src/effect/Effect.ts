import { doReplacements } from '../fn'
import TwitchHelixClient from '../services/TwitchHelixClient'
import { FunctionCommand, Module, RawCommand, TwitchEventContext } from '../types'

export abstract class Effect<EffectData> {
  #sayFn: (str: string) => void

  constructor(
    protected readonly effect: EffectData,
    protected readonly originalCmd: FunctionCommand,
    protected readonly contextModule: Module,
    protected readonly rawCmd: RawCommand | null,
    protected readonly context: TwitchEventContext | null,
  ) {
    this.#sayFn = contextModule.bot.sayFn(contextModule.user)
  }

  abstract apply(): Promise<void>

  protected async doReplacements(str: string): Promise<string> {
    return await doReplacements(
      str,
      this.rawCmd,
      this.context,
      this.originalCmd,
      this.contextModule.bot,
      this.contextModule.user,
    )
  }

  protected async say(str: string): Promise<void> {
    this.#sayFn(str)
  }

  protected getHelixClient(): TwitchHelixClient | null {
    return this.contextModule.bot
      .getUserTwitchClientManager(this.contextModule.user)
      .getHelixClient()
  }

  protected async getAccessToken(): Promise<string | null> {
    return await this.contextModule.bot
      .getRepos().oauthToken
      .getMatchingAccessToken(this.contextModule.user)
  }

  protected notifyWs(moduleName: string, data: any): void {
    this.contextModule.bot
      .getWebSocketServer()
      .notifyAll(
        [this.contextModule.user.id],
        moduleName,
        data,
      )
  }
}
