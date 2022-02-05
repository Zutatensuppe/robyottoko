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
  hideVideoImage: MediaFile
  customCss: string
  customCssPresets: SongrequestModuleCustomCssPreset[]
  initAutoplay: boolean
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
  hideVideoImage: {
    file: obj?.hideVideoImage?.file || '',
    filename: obj?.hideVideoImage?.filename || '',
    urlpath: obj?.hideVideoImage?.urlpath ? obj.hideVideoImage.urlpath : (
      obj?.hideVideoImage?.file ? `/uploads/${encodeURIComponent(obj.hideVideoImage.file)}` : ''
    )
  },
  customCss: obj?.customCss || '',
  customCssPresets: typeof obj?.customCssPresets === 'undefined' ? [] : obj.customCssPresets.map(default_custom_css_preset),

  showProgressBar: typeof obj?.showProgressBar === 'undefined' ? false : obj.showProgressBar,
  initAutoplay: typeof obj?.initAutoplay === 'undefined' ? true : obj.initAutoplay,
  showThumbnails: typeof obj?.showThumbnails === 'undefined' || obj.showThumbnails === true ? 'left' : obj.showThumbnails,
  maxItemsShown: typeof obj?.maxItemsShown === 'undefined' ? -1 : obj.maxItemsShown,
})
