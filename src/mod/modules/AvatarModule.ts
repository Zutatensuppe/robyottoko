import { logger } from '../../common/fn'
import { Socket } from '../../net/WebSocketServer'
import { Bot, ChatMessageContext, Module, RewardRedemptionContext } from '../../types'
import { User } from '../../services/Users'
import { AvatarModuleSettings, AvatarModuleState, AvatarModuleWsSaveData, default_settings, default_state } from './AvatarModuleCommon'

const log = logger('AvatarModule.ts')

export interface AvatarModuleData {
  settings: AvatarModuleSettings
  state: AvatarModuleState
}

export interface AvatarModuleWsData {
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
  public name = 'avatar'

  public bot: Bot
  public user: User

  private data: AvatarModuleData

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

  save() {
    this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
  }

  saveCommands() {
    // pass
  }

  reinit(): AvatarModuleData {
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {})
    return {
      settings: default_settings(data.settings),
      state: default_state(data.state),
    }
  }

  getRoutes() {
    return {}
  }

  wsdata(event: string): WsModuleData {
    return {
      event,
      data: {
        settings: this.data.settings,
        state: this.data.state,
        controlWidgetUrl: this.bot.getWebServer().getWidgetUrl('avatar', this.user.id),
        displayWidgetUrl: this.bot.getWebServer().getWidgetUrl('avatar_receive', this.user.id),
      }
    }
  }

  updateClient(data: WsModuleData, ws: Socket) {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, data, ws)
  }

  updateClients(data: WsControlData | WsModuleData) {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, data)
  }

  getWsEvents() {
    return {
      'conn': (ws: Socket) => {
        this.updateClient(this.wsdata('init'), ws)
      },
      'save': (_ws: Socket, data: AvatarModuleWsSaveData) => {
        this.data.settings = data.settings
        this.save()
        this.data = this.reinit()
        this.updateClients(this.wsdata('init'))
      },
      'ctrl': (_ws: Socket, data: AvatarModuleWsControlData) => {
        if (data.data.ctrl === "setSlot") {
          const tuberIdx = data.data.args[0];
          const slotName = data.data.args[1];
          const itemIdx = data.data.args[2];
          try {
            this.data.settings.avatarDefinitions[tuberIdx].state.slots[slotName] = itemIdx
            this.save()
          } catch (e) {
            log.error('ws ctrl: unable to setSlot', tuberIdx, slotName, itemIdx)
          }
        } else if (data.data.ctrl === "lockState") {
          const tuberIdx = data.data.args[0];
          const lockedState = data.data.args[1];
          try {
            this.data.settings.avatarDefinitions[tuberIdx].state.lockedState = lockedState
            this.save()
          } catch (e) {
            log.error('ws ctrl: unable to lockState', tuberIdx, lockedState)
          }
        } else if (data.data.ctrl === "setTuber") {
          const tuberIdx = data.data.args[0];
          this.data.state.tuberIdx = tuberIdx
          this.save()
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

  async onRewardRedemption(_RewardRedemptionContext: RewardRedemptionContext) {
    // pass
  }
}

export default AvatarModule
