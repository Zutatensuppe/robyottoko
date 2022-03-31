import config from '../../config'
import { Socket } from '../../net/WebSocketServer'
import { getText, asQueryArgs } from '../../net/xhr'
import { User } from '../../services/Users'
import { Bot, ChatMessageContext, Module, RewardRedemptionContext } from '../../types'
import { default_settings, SpeechToTextModuleData, SpeechToTextModuleSettings, SpeechToTextWsData } from './SpeechToTextModuleCommon'

class SpeechToTextModule implements Module {
  public name = 'speech-to-text'

  public bot: Bot
  public user: User
  private data: SpeechToTextModuleData

  constructor(
    bot: Bot,
    user: User,
  ) {
    this.bot = bot
    this.user = user
    this.data = this.reinit()
  }

  async userChanged(user: User) {
    this.user = user
  }

  reinit() {
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {})
    return {
      settings: default_settings(data.settings),
    }
  }

  saveCommands() {
    // pass
  }

  getRoutes() {
    return {}
  }

  wsdata(eventName: string): SpeechToTextWsData {
    return {
      event: eventName,
      data: {
        settings: this.data.settings,
        controlWidgetUrl: this.bot.getWebServer().getWidgetUrl('speech-to-text', this.user.id),
        displayWidgetUrl: this.bot.getWebServer().getWidgetUrl('speech-to-text_receive', this.user.id),
      }
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
      'onVoiceResult': async (ws: Socket, { text }: { text: string }) => {
        let translated = ''
        if (this.data.settings.translation.enabled) {
          const scriptId = config.modules.speechToText.google.scriptId
          const query = `https://script.google.com/macros/s/${scriptId}/exec` + asQueryArgs({
            text: text,
            source: this.data.settings.translation.langSrc,
            target: this.data.settings.translation.langDst,
          })
          translated = await getText(query)
        }
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'text',
          data: {
            recognized: text,
            translated: translated,
          },
        })
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
