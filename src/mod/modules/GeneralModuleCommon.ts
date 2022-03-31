import { Command, GlobalVariable } from "../../types"

export interface GeneralModuleSettings {
  volume: number
}

export interface GeneralModuleAdminSettings {
  showImages: boolean
  autocommands: string[]
}

export const default_settings = (): GeneralModuleSettings => ({
  volume: 100,
})

export const default_admin_settings = (): GeneralModuleAdminSettings => ({
  showImages: true,
  autocommands: [],
})

export interface GeneralModuleWsEventData {
  commands: Command[]
  settings: GeneralModuleSettings
  adminSettings: GeneralModuleAdminSettings
  globalVariables: GlobalVariable[]
  channelPointsCustomRewards: Record<string, string[]>
  mediaWidgetUrl: string
}

export interface GeneralSaveEventData {
  event: "save";
  commands: Command[];
  settings: GeneralModuleSettings;
  adminSettings: GeneralModuleAdminSettings;
}
