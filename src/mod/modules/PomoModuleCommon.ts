'use strict'

import { getProp } from '../../common/fn'
import type { SoundMediaFile } from '../../types'

export interface PomoEffect {
  chatMessage: string
  sound: SoundMediaFile
}

export interface PomoNotification {
  effect: PomoEffect,

  //     0 = end of pomo
  // -1000 = 1s before end of pomo
  //  1000 = 1s after end of pomo
  offsetMs: string | number, // can be human readable
}

export interface PomoModuleSettings {
  fontFamily: string
  fontSize: string
  color: string

  timerFormat: string
  showTimerWhenFinished: boolean
  finishedText: string

  startEffect: PomoEffect
  endEffect: PomoEffect
  stopEffect: PomoEffect

  notifications: PomoNotification[]
}

export interface PomoModuleState {
  running: boolean
  durationMs: number
  startTs: string
  doneTs: string
  name: string
}

export interface PomoModuleData {
  settings: PomoModuleSettings
  state: PomoModuleState
  enabled: boolean
}

export interface PomoModuleWsDataData {
  settings: PomoModuleSettings
  state: PomoModuleState
  enabled: boolean
  widgetUrl: string
}

export interface PomoModuleWsData {
  event: string
  data: PomoModuleWsDataData
}

export interface PomoModuleWsEffectData {
  event: 'effect'
  data: PomoEffect
}

export interface PomoModuleWsSaveData {
  event: string
  settings: PomoModuleSettings
}

export const default_effect = (obj: any = null): PomoEffect => ({
  chatMessage: getProp(obj, ['chatMessage'], ''),
  sound: getProp(obj, ['sound'], { file: '', filename: '', urlpath: '', volume: 100 }),
})

export const default_notification = (obj: any = null): PomoNotification => ({
  effect: default_effect(getProp(obj, ['effect'], null)),
  offsetMs: getProp(obj, ['offsetMs'], ''),
})

export const default_settings = (obj: any = null): PomoModuleSettings => ({
  fontFamily: getProp(obj, ['fontFamily'], ''),
  fontSize: getProp(obj, ['fontSize'], '72px'),
  color: getProp(obj, ['color'], ''),
  timerFormat: getProp(obj, ['timerFormat'], '{mm}:{ss}'),
  showTimerWhenFinished: getProp(obj, ['showTimerWhenFinished'], true),
  finishedText: getProp(obj, ['finishedText'], ''),
  startEffect: default_effect(getProp(obj, ['startEffect'], null)),
  endEffect: default_effect(getProp(obj, ['endEffect'], null)),
  stopEffect: default_effect(getProp(obj, ['stopEffect'], null)),
  notifications: getProp(obj, ['notifications'], []).map(default_notification),
})

export const default_state = (obj: any = null): PomoModuleState => ({
  running: getProp(obj, ['running'], false),
  durationMs: getProp(obj, ['durationMs'], (25 * 60 * 1000)),
  startTs: getProp(obj, ['startTs'], ''),
  doneTs: getProp(obj, ['doneTs'], ''),
  name: getProp(obj, ['name'], ''),
})
