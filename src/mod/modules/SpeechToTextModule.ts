import { asQueryArgs } from '../../common/fn'
import config from '../../config'
import type { Socket } from '../../net/WebSocketServer'
import xhr from '../../net/xhr'
import type { User } from '../../repo/Users'
import type { Bot, ChatMessageContext, Module} from '../../types'
import { MODULE_NAME, WIDGET_TYPE } from '../../types'
import type { SpeechToTextModuleData, SpeechToTextModuleSettings, SpeechToTextWsData } from './SpeechToTextModuleCommon'
import { default_settings } from './SpeechToTextModuleCommon'

class SpeechToTextModule implements Module {
  public name = MODULE_NAME.SPEECH_TO_TEXT

  // @ts-ignore
  private data: SpeechToTextModuleData

  constructor(
    public readonly bot: Bot,
    public user: User,
  ) {
    // @ts-ignore
    return (async () => {
      this.data = await this.reinit()
      return this
    })()
  }

  async userChanged(user: User) {
    this.user = user
  }

  async reinit() {
    const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {})
    return {
      settings: default_settings(data.settings),
      enabled,
    }
  }

  isEnabled(): boolean {
    return this.data.enabled
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.data.enabled = enabled
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
        enabled: this.data.enabled,
        settings: this.data.settings,
        controlWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.SPEECH_TO_TEXT_CONTROL, this.user.id),
        displayWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.SPEECH_TO_TEXT_RECEIVE, this.user.id),
      },
    }
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
        await this.bot.getRepos().module.save(this.user.id, this.name, this.data)
        this.data = await this.reinit()
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
