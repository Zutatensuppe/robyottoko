"use strict";

import { getProp } from "../../common/fn";
import { DrawcastSettings, MediaFile, SoundMediaFile } from "../../types";

export interface DrawcastModuleWsData {
  event: string
  data: DrawcastModuleWsDataData
}

export interface DrawcastModuleWsDataData {
  settings: DrawcastSettings
  images: DrawcastImage[]
  drawUrl: string
  controlWidgetUrl: string
  receiveWidgetUrl: string
}

export interface DrawcastModuleData {
  settings: DrawcastSettings
  images: DrawcastImage[]
}

export interface DrawcastSaveEventData {
  event: "save"
  settings: DrawcastSettings
}

// todo: fallbacks for file and filename
const default_profile_image = (obj: any): MediaFile | null => {
  if (!obj) {
    return null
  }
  return {
    file: obj.file,
    filename: obj.filename,
    urlpath: (!obj.urlpath && obj.file) ? `/uploads/${encodeURIComponent(obj.file)}` : obj.urlpath,
  }
}


// todo: fallbacks for file, filename and volume
const default_notification_sound = (obj: any): SoundMediaFile | null => {
  if (!obj) {
    return null
  }
  return {
    file: obj.file,
    filename: obj.filename,
    urlpath: (!obj.urlpath && obj.file) ? `/uploads/${encodeURIComponent(obj.file)}` : obj.urlpath,
    volume: obj.volume,
  }
}

export const default_settings = (obj: any = null): DrawcastSettings => ({
  submitButtonText: getProp(obj, ['submitButtonText'], 'Submit'),
  // leave empty to not require confirm
  submitConfirm: getProp(obj, ['submitConfirm'], ''),
  recentImagesTitle: getProp(obj, ['recentImagesTitle'], ''),
  canvasWidth: getProp(obj, ['canvasWidth'], 720),
  canvasHeight: getProp(obj, ['canvasHeight'], 405),
  customDescription: getProp(obj, ['customDescription'], ''),
  customProfileImage: (!obj || typeof obj.customProfileImage === 'undefined') ? null : default_profile_image(obj.customProfileImage),
  palette: getProp(obj, ['palette'], [
    // row 1
    '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
    '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',

    // row 2
    '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
    '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
  ]),
  displayDuration: getProp(obj, ['displayDuration'], 5000),
  displayLatestForever: getProp(obj, ['displayLatestForever'], false),
  displayLatestAutomatically: getProp(obj, ['displayLatestAutomatically'], false),
  autofillLatest: getProp(obj, ['autofillLatest'], false),
  notificationSound: (!obj || typeof obj.notificationSound === 'undefined') ? null : default_notification_sound(obj.notificationSound),
  requireManualApproval: getProp(obj, ['requireManualApproval'], false),
  favoriteLists: getProp(obj, ['favoriteLists'], [{
    list: getProp(obj, ['favorites'], []),
    title: getProp(obj, ['favoriteImagesTitle'], ''),
  }]),
})

export interface DrawcastImage {
  path: string
  approved: boolean
}

export const default_images = (list: any = null): DrawcastImage[] => {
  if (Array.isArray(list)) {
    // TODO: sanitize
    return list
  }
  return []
}
