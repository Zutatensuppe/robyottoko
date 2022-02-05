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
}

export interface AvatarModuleSettings {
  styles: {
    // page background color
    bgColor: string,
  },
  avatarDefinitions: AvatarModuleAvatarDefinition[]
}

export const default_settings = (): AvatarModuleSettings => ({
  styles: {
    // page background color
    bgColor: '#80ff00',
  },
  avatarDefinitions: []
})

export interface AvatarModuleState {
  tuberIdx: number
  slots: Record<SlotName, number>
  lockedState: string
}

export interface AvatarModuleWsInitData {
  settings: AvatarModuleSettings
  state: AvatarModuleState
}

export interface AvatarModuleWsSaveData {
  event: 'save'
  settings: AvatarModuleSettings
}
