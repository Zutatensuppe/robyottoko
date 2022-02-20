import { SoundMediaFile } from "../../types";

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
}

export interface PomoModuleWsData {
  event: string
  data: PomoModuleData
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
  chatMessage: (!obj || typeof obj.chatMessage === 'undefined') ? '' : obj.chatMessage,
  sound: (!obj || typeof obj.sound === 'undefined') ? { file: '', filename: '', urlpath: '', volume: 100 } : obj.sound,
})

export const default_notification = (obj: any = null): PomoNotification => ({
  effect: (!obj || typeof obj.effect === 'undefined') ? default_effect() : default_effect(obj.effect),
  offsetMs: (!obj || typeof obj.offsetMs === 'undefined') ? '' : obj.offsetMs,
})

export const default_settings = (obj: any = null): PomoModuleSettings => ({
  fontFamily: (!obj || typeof obj.fontFamily === 'undefined') ? '' : obj.fontFamily,
  fontSize: (!obj || typeof obj.fontSize === 'undefined') ? '72px' : obj.fontSize,
  color: (!obj || typeof obj.color === 'undefined') ? '' : obj.color,
  timerFormat: (!obj || typeof obj.timerFormat === 'undefined') ? '{mm}:{ss}' : obj.timerFormat,
  showTimerWhenFinished: (!obj || typeof obj.showTimerWhenFinished === 'undefined') ? true : obj.showTimerWhenFinished,
  finishedText: (!obj || typeof obj.finishedText === 'undefined') ? '' : obj.finishedText,
  startEffect: (!obj || typeof obj.startEffect === 'undefined') ? default_effect() : default_effect(obj.startEffect),
  endEffect: (!obj || typeof obj.endEffect === 'undefined') ? default_effect() : default_effect(obj.endEffect),
  stopEffect: (!obj || typeof obj.stopEffect === 'undefined') ? default_effect() : default_effect(obj.stopEffect),
  notifications: (!obj || typeof obj.notifications === 'undefined') ? [] : obj.notifications.map(default_notification),
})

export const default_state = (obj: any = null): PomoModuleState => ({
  running: (!obj || typeof obj.running === 'undefined') ? false : obj.running,
  durationMs: (!obj || typeof obj.durationMs === 'undefined') ? (25 * 60 * 1000) : obj.durationMs,
  startTs: (!obj || typeof obj.startTs === 'undefined') ? '' : obj.startTs,
  doneTs: (!obj || typeof obj.doneTs === 'undefined') ? '' : obj.doneTs,
  name: (!obj || typeof obj.name === 'undefined') ? '' : obj.name,
})
