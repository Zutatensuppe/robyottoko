import { Command, FunctionCommand, GlobalVariable, MediaFile, PlaylistItem } from "../../types"

interface SongrequestModuleCustomCssPreset {
  name: string
  css: string
  showProgressBar: boolean
  showThumbnails: string | false
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
  customCss: string
  customCssPresets: SongrequestModuleCustomCssPreset[]
  showProgressBar: boolean
  showThumbnails: string | false
  maxItemsShown: number
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
}

const default_custom_css_preset = (obj: any = null): SongrequestModuleCustomCssPreset => ({
  name: obj?.name || '',
  css: obj?.css || '',
  showProgressBar: typeof obj?.showProgressBar === 'undefined' ? false : obj.showProgressBar,
  showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
  maxItemsShown: typeof obj?.maxItemsShown === 'undefined' ? -1 : obj.maxItemsShown,
})

export const default_settings = (obj: any = null): SongrequestModuleSettings => ({
  volume: typeof obj?.volume === 'undefined' ? 100 : obj.volume,
  initAutoplay: typeof obj?.initAutoplay === 'undefined' ? true : obj.initAutoplay,
  hideVideoImage: {
    file: obj?.hideVideoImage?.file || '',
    filename: obj?.hideVideoImage?.filename || '',
    urlpath: obj?.hideVideoImage?.urlpath ? obj.hideVideoImage.urlpath : (
      obj?.hideVideoImage?.file ? `/uploads/${encodeURIComponent(obj.hideVideoImage.file)}` : ''
    )
  },
  maxSongLength: {
    viewer: typeof obj?.maxSongLength === 'undefined' ? 0 : obj?.maxSongLength.viewer,
    mod: typeof obj?.maxSongLength === 'undefined' ? 0 : obj?.maxSongLength.mod,
    sub: typeof obj?.maxSongLength === 'undefined' ? 0 : obj?.maxSongLength.sub,
  },

  customCss: obj?.customCss || '',
  customCssPresets: typeof obj?.customCssPresets === 'undefined' ? [] : obj.customCssPresets.map(default_custom_css_preset),

  showProgressBar: typeof obj?.showProgressBar === 'undefined' ? false : obj.showProgressBar,
  showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
  maxItemsShown: typeof obj?.maxItemsShown === 'undefined' ? -1 : obj.maxItemsShown,
})
