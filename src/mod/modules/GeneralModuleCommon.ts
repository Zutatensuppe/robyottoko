"use strict";

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

export enum EMOTE_DISPLAY_FN {
  BALLOON = 'balloon',
  BOUNCY = 'bouncy',
  EXPLODE = 'explode',
  FLOATING_SPACE = 'floatingSpace',
  FOUNTAIN = 'fountain',
  RAIN = 'rain',
  RANDOM_BEZIER = 'randomBezier',
}

export interface GeneralModuleEmotesEventData {
  displayFn: {
    fn: EMOTE_DISPLAY_FN,
    args: string[]
  }[]
  emotes: {
    url: string
  }[]
}

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
