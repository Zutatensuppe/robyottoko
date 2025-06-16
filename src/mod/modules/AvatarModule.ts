import { logger } from '../../common/fn'
import type { Socket } from '../../net/WebSocketServer'
import type { Bot, ChatMessageContext, Module} from '../../types'
import { MODULE_NAME, WIDGET_TYPE } from '../../types'
import type { User } from '../../repo/Users'
import type { AvatarModuleSettings, AvatarModuleState, AvatarModuleWsSaveData} from './AvatarModuleCommon'
import { default_settings, default_state } from './AvatarModuleCommon'

const log = logger('AvatarModule.ts')

export interface AvatarModuleData {
  settings: AvatarModuleSettings
  state: AvatarModuleState
  enabled: boolean
}

export interface AvatarModuleWsData {
  enabled: boolean
  settings: AvatarModuleSettings
  state: AvatarModuleState
  controlWidgetUrl: string
  displayWidgetUrl: string
}

export interface AvatarModuleWsControlData {
  event: 'ctrl'
  data: {
    ctrl: string
    args: any[]
  }
}

interface WsModuleData {
  event: string // this is always 'init' in this module
  data: AvatarModuleWsData
}

interface WsControlData {
  event: 'ctrl',
  data: AvatarModuleWsControlData,
}

class AvatarModule implements Module {
  public name = MODULE_NAME.AVATAR

  // @ts-ignore
  private data: AvatarModuleData

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

  async userChanged(user: User): Promise<void> {
    this.user = user
  }

  async save(): Promise<void> {
    await this.bot.getRepos().module.save(this.user.id, this.name, this.data)
  }

  saveCommands() {
    // pass
  }

  async reinit(): Promise<AvatarModuleData> {
    const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {})
    return {
      settings: default_settings(data.settings),
      state: default_state(data.state),
      enabled,
    }
  }

  isEnabled(): boolean {
    return this.data.enabled
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.data.enabled = enabled
  }

  getRoutes() {
    return {}
  }

  async wsdata(event: string): Promise<WsModuleData> {
    return {
      event,
      data: {
        enabled: this.data.enabled,
        settings: this.data.settings,
        state: this.data.state,
        controlWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.AVATAR_CONTROL, this.user.id),
        displayWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.AVATAR_RECEIVE, this.user.id),
      },
    }
  }

  updateClient(data: WsModuleData, ws: Socket): void {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, data, ws)
  }

  updateClients(data: WsControlData | WsModuleData): void {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, data)
  }

  getWsEvents() {
    return {
      'conn': async (ws: Socket) => {
        this.updateClient(await this.wsdata('init'), ws)
      },
      'save': async (_ws: Socket, data: AvatarModuleWsSaveData) => {
        this.data.settings = data.settings
        await this.save()
        this.data = await this.reinit()
        this.updateClients(await this.wsdata('init'))
      },
      'ctrl': async (_ws: Socket, data: AvatarModuleWsControlData) => {
        if (data.data.ctrl === 'setSlot') {
          const tuberIdx = data.data.args[0]
          const slotName = data.data.args[1]
          const itemIdx = data.data.args[2]
          try {
            this.data.settings.avatarDefinitions[tuberIdx].state.slots[slotName] = itemIdx
            await this.save()
          } catch (e) {
            log.error({ tuberIdx, slotName, itemIdx }, 'ws ctrl: unable to setSlot')
          }
        } else if (data.data.ctrl === 'lockState') {
          const tuberIdx = data.data.args[0]
          const lockedState = data.data.args[1]
          try {
            this.data.settings.avatarDefinitions[tuberIdx].state.lockedState = lockedState
            await this.save()
          } catch (e) {
            log.error({ tuberIdx, lockedState }, 'ws ctrl: unable to lockState')
          }
        } else if (data.data.ctrl === 'setTuber') {
          const tuberIdx = data.data.args[0]
          this.data.state.tuberIdx = tuberIdx
          await this.save()
        }

        // just pass the ctrl on to the clients
        this.updateClients({ event: 'ctrl', data })
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

export default AvatarModule
