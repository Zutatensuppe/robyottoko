'use strict'

import { getProp } from '../../common/fn'
import type { Command, GlobalVariable } from '../../types'

export interface EmoteDisplayFn {
  fn: EMOTE_DISPLAY_FN,
  args: string[]
}

export interface GeneralModuleSettings {
  volume: number
  emotes: {
    displayFn: EmoteDisplayFn[]
  }
}

export interface GeneralModuleAdminSettings {
  showImages: boolean
  autocommands: string[]
}

export const default_settings = (obj: any = null): GeneralModuleSettings => ({
  volume: getProp(obj, ['volume'], 100),
  emotes: {
    displayFn: getProp(obj, ['emotes', 'displayFn'], [
      { fn: EMOTE_DISPLAY_FN.BALLOON, args: [] },
      { fn: EMOTE_DISPLAY_FN.BOUNCY, args: [] },
      { fn: EMOTE_DISPLAY_FN.EXPLODE, args: [] },
      { fn: EMOTE_DISPLAY_FN.FLOATING_SPACE, args: [] },
      { fn: EMOTE_DISPLAY_FN.FOUNTAIN, args: [] },
      { fn: EMOTE_DISPLAY_FN.RAIN, args: [] },
      { fn: EMOTE_DISPLAY_FN.RANDOM_BEZIER, args: [] },
    ]),
  },
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

export const possibleEmoteDisplayFunctions = [
  EMOTE_DISPLAY_FN.BALLOON,
  EMOTE_DISPLAY_FN.BOUNCY,
  EMOTE_DISPLAY_FN.EXPLODE,
  EMOTE_DISPLAY_FN.FLOATING_SPACE,
  EMOTE_DISPLAY_FN.FOUNTAIN,
  EMOTE_DISPLAY_FN.RAIN,
  EMOTE_DISPLAY_FN.RANDOM_BEZIER,
]

export interface GeneralModuleEmotesEventData {
  displayFn: EmoteDisplayFn[]
  emotes: {
    url: string
  }[]
}

export interface GeneralModuleWsEventData {
  enabled: boolean
  commands: Command[]
  settings: GeneralModuleSettings
  adminSettings: GeneralModuleAdminSettings
  globalVariables: GlobalVariable[]
  channelPointsCustomRewards: Record<string, string[]>
  mediaWidgetUrl: string
  mediaV2WidgetUrl: string
  emoteWallWidgetUrl: string
  rouletteWidgetUrl: string
}

export interface GeneralSaveEventData {
  event: 'save';
  commands: Command[];
  settings: GeneralModuleSettings;
  adminSettings: GeneralModuleAdminSettings;
}
