import config from '../../config'
import { Socket } from '../../net/WebSocketServer'
import xhr, { asQueryArgs } from '../../net/xhr'
import { User } from '../../services/Users'
import { Bot, ChatMessageContext, Module } from '../../types'
import { default_settings, SpeechToTextModuleData, SpeechToTextModuleSettings, SpeechToTextWsData } from './SpeechToTextModuleCommon'

class SpeechToTextModule implements Module {
  public name = 'speech-to-text'

  // @ts-ignore
  public bot: Bot
  // @ts-ignore
  public user: User
  // @ts-ignore
  private data: SpeechToTextModuleData

  constructor(
    bot: Bot,
    user: User,
  ) {
    // @ts-ignore
    return (async () => {
      this.bot = bot
      this.user = user
      this.data = await this.reinit()
      return this;
    })();
  }

  async userChanged(user: User) {
    this.user = user
  }

  async reinit() {
    const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {})
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

  async wsdata(eventName: string): Promise<SpeechToTextWsData> {
    return {
      event: eventName,
      data: {
        settings: this.data.settings,
        controlWidgetUrl: await this.bot.getWidgets().getWidgetUrl('speech-to-text', this.user.id),
        displayWidgetUrl: await this.bot.getWidgets().getWidgetUrl('speech-to-text_receive', this.user.id),
      }
    };
  }

  async updateClient(eventName: string, ws: Socket): Promise<void> {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws)
  }

  async updateClients(eventName: string): Promise<void> {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName))
  }

  getWsEvents() {
    return {
      'onVoiceResult': async (_ws: Socket, { text }: { text: string }) => {
        let translated = ''
        if (this.data.settings.translation.enabled) {
          const scriptId = config.modules.speechToText.google.scriptId
          const query = `https://script.google.com/macros/s/${scriptId}/exec` + asQueryArgs({
            text: text,
            source: this.data.settings.translation.langSrc,
            target: this.data.settings.translation.langDst,
          })
          const resp = await xhr.get(query)
          translated = await resp.text()
        }
        this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, {
          event: 'text',
          data: {
            recognized: text,
            translated: translated,
          },
        })
      },
      'conn': async (ws: Socket) => {
        await this.updateClient('init', ws)
      },
      'save': async (_ws: Socket, { settings }: { settings: SpeechToTextModuleSettings }) => {
        this.data.settings = settings
        this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
        await this.reinit()
        await this.updateClients('init')
      },
    }
  }
  getCommands() {
    return []
  }

  async onChatMsg(_chatMessageContext: ChatMessageContext) {
    // pass
  }
}

export default SpeechToTextModule
