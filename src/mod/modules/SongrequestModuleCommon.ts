"use strict";

import { Command, FunctionCommand, GlobalVariable, MediaFile, PlaylistItem } from "../../types"
import { commands } from '../../common/commands'
import { getProp } from "../../common/fn"
import { presets } from "./SongrequestPresets";

export interface TagInfo {
  value: string
  count: number
}

export type SortDirection = -1 | 1
export enum SortBy {
  TITLE = 'title',
  TIMESTAMP = 'timestamp',
  PLAYS = 'plays',
  USER = 'user',
  DURATION = 'duration',
}

export interface SongrequestModuleCustomCssPreset {
  name: string
  css: string
  showProgressBar: boolean
  showThumbnails: string | false
  hidePlayer: boolean
  timestampFormat: string
  maxItemsShown: number
}

export interface SongrequestModuleData {
  filter: SongRequestModuleFilter
  settings: SongrequestModuleSettings
  playlist: PlaylistItem[]
  commands: Command[],
  stacks: Record<string, string[]>
}

export interface SongerquestModuleInitData {
  data: SongrequestModuleData
  commands: FunctionCommand[]
  shouldSave: boolean
}

export interface SongrequestModuleSettings {
  volume: number
  initAutoplay: boolean
  hideVideoImage: MediaFile
  maxSongLength: {
    viewer: number | string
    mod: number | string
    sub: number | string
  }
  maxSongsQueued: {
    viewer: number
    mod: number
    sub: number
  }
  customCssPresets: SongrequestModuleCustomCssPreset[]
  customCssPresetIdx: number
}

export interface SongrequestModuleLimits {
  maxLenMs: number
  maxQueued: number
}

export interface SongRequestModuleFilter {
  tag: string
}

export interface SongrequestModuleWsEventData {
  filter: {
    tag: string
  },
  playlist: PlaylistItem[],
  commands: Command[],
  globalVariables: GlobalVariable[],
  channelPointsCustomRewards: Record<string, string[]>,
  settings: SongrequestModuleSettings,
  widgetUrl: string,
}

export const default_custom_css_preset = (obj: any = null): SongrequestModuleCustomCssPreset => ({
  name: getProp(obj, ['name'], ''),
  css: getProp(obj, ['css'], ''),
  showProgressBar: getProp(obj, ['showProgressBar'], false),
  showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
  maxItemsShown: getProp(obj, ['maxItemsShown'], -1),
  timestampFormat: typeof obj?.timestampFormat === 'undefined' ? '' : obj.timestampFormat,
  hidePlayer: getProp(obj, ['hidePlayer'], false),
})

export const default_commands = (list: any = null) => {
  if (Array.isArray(list)) {
    // TODO: sanitize items
    return list
  }
  return [
    // default commands for song request
    commands.sr_current.NewCommand(),
    commands.sr_undo.NewCommand(),
    commands.sr_good.NewCommand(),
    commands.sr_bad.NewCommand(),
    commands.sr_stats.NewCommand(),
    commands.sr_prev.NewCommand(),
    commands.sr_next.NewCommand(),
    commands.sr_jumptonew.NewCommand(),
    commands.sr_clear.NewCommand(),
    commands.sr_rm.NewCommand(),
    commands.sr_shuffle.NewCommand(),
    commands.sr_reset_stats.NewCommand(),
    commands.sr_loop.NewCommand(),
    commands.sr_noloop.NewCommand(),
    commands.sr_pause.NewCommand(),
    commands.sr_unpause.NewCommand(),
    commands.sr_hidevideo.NewCommand(),
    commands.sr_showvideo.NewCommand(),
    commands.sr_request.NewCommand(),
    commands.sr_re_request.NewCommand(),
    commands.sr_addtag.NewCommand(),
    commands.sr_rmtag.NewCommand(),
    commands.sr_volume.NewCommand(),
    commands.sr_filter.NewCommand(),
    commands.sr_preset.NewCommand(),
    commands.sr_queue.NewCommand(),
  ]
}

export const default_settings = (obj: any = null): SongrequestModuleSettings => ({
  volume: getProp(obj, ['volume'], 100),
  initAutoplay: getProp(obj, ['initAutoplay'], true),
  hideVideoImage: {
    file: getProp(obj, ['hideVideoImage', 'file'], ''),
    filename: getProp(obj, ['hideVideoImage', 'filename'], ''),
    urlpath: obj?.hideVideoImage?.urlpath ? obj.hideVideoImage.urlpath : (
      obj?.hideVideoImage?.file ? `/uploads/${encodeURIComponent(obj.hideVideoImage.file)}` : ''
    )
  },
  maxSongLength: {
    viewer: getProp(obj, ['maxSongLength', 'viewer'], 0),
    mod: getProp(obj, ['maxSongLength', 'mod'], 0),
    sub: getProp(obj, ['maxSongLength', 'sub'], 0),
  },
  maxSongsQueued: {
    viewer: parseInt(String(getProp(obj, ['maxSongsQueued', 'viewer'], 0)), 10),
    mod: parseInt(String(getProp(obj, ['maxSongsQueued', 'mod'], 0)), 10),
    sub: parseInt(String(getProp(obj, ['maxSongsQueued', 'sub'], 0)), 10),
  },
  customCssPresets: getProp(obj, ['customCssPresets'], presets).map(default_custom_css_preset),
  customCssPresetIdx: getProp(obj, ['customCssPresetIdx'], 0),
})
