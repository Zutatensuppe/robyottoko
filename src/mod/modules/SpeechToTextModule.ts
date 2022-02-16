import config from '../../config'
import { Socket } from '../../net/WebSocketServer'
import { getText, asQueryArgs } from '../../net/xhr'
import { User } from '../../services/Users'
import { Bot, ChatMessageContext, Module, RewardRedemptionContext } from '../../types'
import { default_settings, SpeechToTextModuleData, SpeechToTextModuleSettings, SpeechToTextTranslateEventData, SpeechToTextWsData } from './SpeechToTextModuleCommon'

class SpeechToTextModule implements Module {
  public name = 'speech-to-text'

  public bot: Bot
  public user: User
  private defaultSettings: SpeechToTextModuleSettings
  private data: SpeechToTextModuleData

  constructor(
    bot: Bot,
    user: User,
  ) {
    this.bot = bot
    this.user = user
    this.defaultSettings = default_settings()
    this.data = this.reinit()
  }

  async userChanged(user: User) {
    this.user = user
  }

  reinit() {
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {
      settings: this.defaultSettings
    })
    return data as SpeechToTextModuleData
  }

  saveCommands() {
    // pass
  }

  widgets() {
    return {}
  }

  getRoutes() {
    return {}
  }

  wsdata(eventName: string): SpeechToTextWsData {
    return {
      event: eventName,
      data: this.data,
    };
  }

  updateClient(eventName: string, ws: Socket) {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName: string) {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  getWsEvents() {
    return {
      'translate': async (ws: Socket, { text, src, dst }: SpeechToTextTranslateEventData) => {
        const scriptId = config.modules.speechToText.google.scriptId
        const query = `https://script.google.com/macros/s/${scriptId}/exec` + asQueryArgs({
          text: text,
          source: src,
          target: dst,
        })
        const respText = await getText(query)
        this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, {
          event: 'translated', data: {
            in: text,
            out: respText,
          }
        }, ws)
      },
      'conn': (ws: Socket) => {
        this.updateClient('init', ws)
      },
      'save': (ws: Socket, { settings }: { settings: SpeechToTextModuleSettings }) => {
        this.data.settings = settings
        this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
        this.reinit()
        this.updateClients('init')
      },
    }
  }
  getCommands() {
    return []
  }

  async onChatMsg(_chatMessageContext: ChatMessageContext) {
    // pass
  }

  async onRewardRedemption(_rewardRedemptionContext: RewardRedemptionContext) {
    // pass
  }
}

export default SpeechToTextModule
