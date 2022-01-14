import Db from '../../Db'
import { logger } from '../../fn'
import WebServer from '../../WebServer'
import WebSocketServer, { Socket } from '../../net/WebSocketServer'
import Tokens from '../../services/Tokens'
import Variables from '../../services/Variables'
import { ChatMessageContext, RewardRedemptionContext } from '../../types'
import ModuleStorage from '../ModuleStorage'
import { User } from '../../services/Users'
import Cache from '../../services/Cache'
import TwitchClientManager from '../../net/TwitchClientManager'

const log = logger('AvatarModule.ts')

type int = number
type SlotName = string
type SlotUrl = string
type StateValue = string

export interface AvatarModuleAnimationFrameDefinition {
  url: SlotUrl
  duration: int
}

export interface AvatarModuleSlotItemStateDefinition {
  state: StateValue
  frames: AvatarModuleAnimationFrameDefinition[]
}

export interface AvatarModuleAvatarSlotItem {
  title: string
  states: AvatarModuleSlotItemStateDefinition[]
}

export interface AvatarModuleAvatarSlotDefinition {
  slot: SlotName
  defaultItemIndex: int
  items: AvatarModuleAvatarSlotItem[]
}

export interface AvatarModuleAvatarStateDefinition {
  value: StateValue
  deletable: boolean
}

export interface AvatarModuleAvatarDefinition {
  name: string
  width: int
  height: int
  stateDefinitions: AvatarModuleAvatarStateDefinition[]
  slotDefinitions: AvatarModuleAvatarSlotDefinition[]
}

export interface AvatarModuleSettings {
  styles: {
    // page background color
    bgColor: string,
  },
  avatarDefinitions: AvatarModuleAvatarDefinition[]
}

export interface AvatarModuleData {
  settings: AvatarModuleSettings
}

export interface AvatarModuleWsInitData {
  settings: AvatarModuleSettings
  defaultSettings: AvatarModuleSettings
}

export interface AvatarModuleWsSaveData {
  event: 'save'
  settings: AvatarModuleSettings
}

export interface AvatarModuleWsControlData {

}

class AvatarModule {
  public name = 'avatar'
  public variables: Variables

  private user: User
  private wss: WebSocketServer
  private storage: ModuleStorage
  private ws: WebServer
  private tokens: Tokens

  private data: AvatarModuleData
  private defaultSettings: AvatarModuleSettings = {
    styles: {
      // page background color
      bgColor: '#80ff00',
    },
    avatarDefinitions: []
  }

  constructor(
    db: Db,
    user: User,
    variables: Variables,
    clientManager: TwitchClientManager,
    storage: ModuleStorage,
    cache: Cache,
    ws: WebServer,
    wss: WebSocketServer,
  ) {
    this.variables = variables
    this.user = user
    this.wss = wss
    this.storage = storage

    this.ws = ws
    this.tokens = new Tokens(db)
    this.data = this.reinit()
  }

  async userChanged(user: User) {
    this.user = user
  }

  saveCommands() {
    // pass
  }

  reinit(): AvatarModuleData {
    const data = this.storage.load(this.name, {
      settings: this.defaultSettings
    })
    if (!data.settings.styles) {
      data.settings.styles = this.defaultSettings.styles
    }
    if (!data.settings.styles.bgColor) {
      data.settings.styles.bgColor = this.defaultSettings.styles.bgColor
    }

    // -start- fixes to old data structure
    for (let avatarDef of data.settings.avatarDefinitions) {
      if (typeof avatarDef.width === 'undefined') {
        avatarDef.width = 64
      }
      if (typeof avatarDef.height === 'undefined') {
        avatarDef.height = 64
      }
      for (let slotDef of avatarDef.slotDefinitions) {
        for (let item of slotDef.items) {
          // delete item.url
          // item.states = item.animation
          // delete item.animation
          // avatarDef.stateDefinitions.map((stateDefinition: AvatarModuleAvatarStateDefinition) => ({state: stateDefinition.value, frames: [] }))
        }
      }
    }
    // -end-   fixes to old data structure

    return {
      settings: data.settings
    }
  }

  widgets() {
    return {
    }
  }

  getRoutes() {
    return {}
  }

  wsdata(event: string) {
    const data = Object.assign({}, this.data, { defaultSettings: this.defaultSettings })
    return { event, data }
  }

  updateClient(data: Record<string, any>, ws: Socket) {
    this.wss.notifyOne([this.user.id], this.name, data, ws)
  }

  updateClients(data: Record<string, any>) {
    this.wss.notifyAll([this.user.id], this.name, data)
  }

  getWsEvents() {
    return {
      'conn': (ws: Socket) => {
        this.updateClient(this.wsdata('init'), ws)
      },
      'save': (ws: Socket, data: AvatarModuleWsSaveData) => {
        this.data.settings = data.settings
        this.storage.save(this.name, this.data)
        this.data = this.reinit()
        this.updateClients(this.wsdata('init'))
      },
      'ctrl': (ws: Socket, data: AvatarModuleWsControlData) => {
        // just pass the ctrl on to the clients
        this.updateClients({ event: 'ctrl', data })
      },
    }
  }

  getCommands() {
    return []
  }

  async onChatMsg(chatMessageContext: ChatMessageContext) {
  }

  async onRewardRedemption(RewardRedemptionContext: RewardRedemptionContext) {
  }
}

export default AvatarModule
