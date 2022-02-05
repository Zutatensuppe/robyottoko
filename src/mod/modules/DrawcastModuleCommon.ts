import { DrawcastSettings } from "../../types";

export interface DrawcastSaveEventData {
  event: "save"
  settings: DrawcastSettings
}

export const default_settings = (): DrawcastSettings => ({
  submitButtonText: 'Submit',
  submitConfirm: '', // leave empty to not require confirm
  recentImagesTitle: '',
  canvasWidth: 720,
  canvasHeight: 405,
  customDescription: '',
  customProfileImage: null,
  palette: [
    // row 1
    '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
    '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',

    // row 2
    '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
    '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
  ],
  displayDuration: 5000,
  displayLatestForever: false,
  displayLatestAutomatically: false,
  notificationSound: null,
  favoriteLists: [{ list: [], title: '' }],
})
