import { logger } from '../../common/fn'
import WebSocketServer, { Socket } from '../../net/WebSocketServer'
import Variables from '../../services/Variables'
import { Bot, ChatMessageContext, Module, RewardRedemptionContext } from '../../types'
import ModuleStorage from '../ModuleStorage'
import { User } from '../../services/Users'
import TwitchClientManager from '../../net/TwitchClientManager'
import { AvatarModuleSettings, AvatarModuleState, AvatarModuleWsSaveData, default_settings } from './AvatarModuleCommon'

const log = logger('AvatarModule.ts')

export interface AvatarModuleData {
  settings: AvatarModuleSettings
  state: AvatarModuleState
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
  data: AvatarModuleData
}

interface WsControlData {
  event: 'ctrl',
  data: AvatarModuleWsControlData,
}

class AvatarModule implements Module {
  public name = 'avatar'
  public variables: Variables

  private user: User
  private wss: WebSocketServer
  private storage: ModuleStorage

  private data: AvatarModuleData
  private defaultSettings: AvatarModuleSettings = default_settings()
  private defaultState: AvatarModuleState = {
    tuberIdx: -1,
    slots: {},
    lockedState: '',
  }

  constructor(
    bot: Bot,
    user: User,
    _clientManager: TwitchClientManager,
  ) {
    this.variables = bot.getUserVariables(user)
    this.user = user
    this.wss = bot.getWebSocketServer()
    this.storage = bot.getUserModuleStorage(user)

    this.data = this.reinit()
  }

  async userChanged(user: User) {
    this.user = user
  }

  save() {
    log.info('saving', this.data.state)
    this.storage.save(this.name, this.data)
  }

  saveCommands() {
    // pass
  }

  reinit(): AvatarModuleData {
    const data = this.storage.load(this.name, {
      settings: this.defaultSettings,
      state: this.defaultState,
    })
    if (!data.state) {
      data.state = this.defaultState
    }
    if (!data.settings.styles) {
      data.settings.styles = this.defaultSettings.styles
    }
    if (!data.settings.styles.bgColor) {
      data.settings.styles.bgColor = this.defaultSettings.styles.bgColor
    }

    // -start- fixes to old data structure
    for (const avatarDef of data.settings.avatarDefinitions) {
      if (typeof avatarDef.width === 'undefined') {
        avatarDef.width = 64
      }
      if (typeof avatarDef.height === 'undefined') {
        avatarDef.height = 64
      }
      for (const slotDef of avatarDef.slotDefinitions) {
        for (const _item of slotDef.items) {
          // delete item.url
          // item.states = item.animation
          // delete item.animation
          // avatarDef.stateDefinitions.map((stateDefinition: AvatarModuleAvatarStateDefinition) => ({state: stateDefinition.value, frames: [] }))
        }
      }
    }
    // -end-   fixes to old data structure
    return {
      settings: data.settings,
      state: data.state,
    }
  }

  widgets() {
    return {}
  }

  getRoutes() {
    return {}
  }

  wsdata(event: string): WsModuleData {
    return { event, data: this.data }
  }

  updateClient(data: WsModuleData, ws: Socket) {
    this.wss.notifyOne([this.user.id], this.name, data, ws)
  }

  updateClients(data: WsControlData | WsModuleData) {
    this.wss.notifyAll([this.user.id], this.name, data)
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
          const slotName = data.data.args[0];
          const itemIdx = data.data.args[1];
          this.data.state.slots[slotName] = itemIdx
          this.save()
        } else if (data.data.ctrl === "lockState") {
          const lockedState = data.data.args[0];
          this.data.state.lockedState = lockedState
          this.save()
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
