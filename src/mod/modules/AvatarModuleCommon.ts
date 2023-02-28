
import { getProp } from '../../common/fn'

type int = number
export type SlotName = string
export type SlotUrl = string
export type StateValue = string

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
  state: AvatarModuleAvatarState
}

export interface AvatarModuleSettings {
  styles: {
    // page background color
    bgColor: string,
    bgColorEnabled: boolean,
  },
  avatarDefinitions: AvatarModuleAvatarDefinition[]
}

export const default_avatar_definition = (def: any = null): AvatarModuleAvatarDefinition => {
  return {
    name: getProp(def, ['name'], ''),
    width: getProp(def, ['width'], 64),
    height: getProp(def, ['height'], 64),
    stateDefinitions: getProp(def, ['stateDefinitions'], []),
    slotDefinitions: getProp(def, ['slotDefinitions'], []),
    state: getProp(def, ['state'], { slots: {}, lockedState: '' }),
  }
}
export const default_state = (obj: any = null): AvatarModuleState => ({
  tuberIdx: getProp(obj, ['tuberIdx'], -1),
})

export const default_settings = (obj: any = null): AvatarModuleSettings => ({
  styles: {
    // page background color
    bgColor: getProp(obj, ['styles', 'bgColor'], '#80ff00'),
    bgColorEnabled: getProp(obj, ['styles', 'bgColorEnabled'], true),
  },
  avatarDefinitions: getProp(obj, ['avatarDefinitions'], []).map(default_avatar_definition),
})

export interface AvatarModuleState {
  tuberIdx: number
}

export interface AvatarModuleAvatarState {
  slots: Record<SlotName, number>
  lockedState: string
}

export interface AvatarModuleWsInitData {
  settings: AvatarModuleSettings
  state: AvatarModuleState
  controlWidgetUrl: string
  displayWidgetUrl: string
}

export interface AvatarModuleWsSaveData {
  event: 'save'
  settings: AvatarModuleSettings
}
