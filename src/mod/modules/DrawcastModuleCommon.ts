import { DrawcastSettings, MediaFile, SoundMediaFile } from "../../types";

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
  submitButtonText: (!obj || typeof obj.submitButtonText === 'undefined') ? 'Submit' : obj.submitButtonText,
  // leave empty to not require confirm
  submitConfirm: (!obj || typeof obj.submitConfirm === 'undefined') ? '' : obj.submitConfirm,
  recentImagesTitle: (!obj || typeof obj.recentImagesTitle === 'undefined') ? '' : obj.recentImagesTitle,
  canvasWidth: (!obj || typeof obj.canvasWidth === 'undefined') ? 720 : obj.canvasWidth,
  canvasHeight: (!obj || typeof obj.canvasHeight === 'undefined') ? 405 : obj.canvasHeight,
  customDescription: (!obj || typeof obj.customDescription === 'undefined') ? '' : obj.customDescription,
  customProfileImage: (!obj || typeof obj.customProfileImage === 'undefined') ? null : default_profile_image(obj.customProfileImage),
  palette: (!obj || typeof obj.palette === 'undefined') ? [
    // row 1
    '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
    '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',

    // row 2
    '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
    '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
  ] : obj.palette,
  displayDuration: (!obj || typeof obj.displayDuration === 'undefined') ? 5000 : obj.displayDuration,
  displayLatestForever: (!obj || typeof obj.displayLatestForever === 'undefined') ? false : obj.displayLatestForever,
  displayLatestAutomatically: (!obj || typeof obj.displayLatestAutomatically === 'undefined') ? false : obj.displayLatestAutomatically,
  autofillLatest: (!obj || typeof obj.autofillLatest === 'undefined') ? false : obj.autofillLatest,
  notificationSound: (!obj || typeof obj.notificationSound === 'undefined') ? null : default_notification_sound(obj.notificationSound),
  favoriteLists: (!obj || typeof obj.favoriteLists === 'undefined')
    ? [{
      list: ((obj && obj.favorites) ? obj.favorites : []),
      title: ((obj && obj.favoriteImagesTitle) ? obj.favoriteImagesTitle : ''),
    }]
    : obj.favoriteLists,
})
