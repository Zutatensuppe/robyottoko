"use strict";

import { getProp } from "../../common/fn"

export interface SpeechToTextModuleStylesPack {
  fontFamily: string
  fontSize: string
  fontWeight: string
  strokeWidth: string
  strokeColor: string
  color: string
}

export interface SpeechToTextModuleSettings {
  status: {
    enabled: boolean
  }
  styles: {
    // page background color
    bgColor: string
    bgColorEnabled: boolean
    // vertical align of text
    vAlign: 'bottom' | 'top' | 'bottom'

    // recognized text
    recognition: SpeechToTextModuleStylesPack

    // translated text
    translation: SpeechToTextModuleStylesPack
  }

  recognition: {
    display: boolean
    lang: string
    synthesize: boolean
    synthesizeLang: string
  }

  translation: {
    enabled: boolean
    langSrc: string
    langDst: string
    synthesize: boolean
    synthesizeLang: string
  }
}

export interface SpeechToTextModuleData {
  settings: SpeechToTextModuleSettings
}

export interface SpeechToTextWsInitData {
  settings: SpeechToTextModuleSettings
  controlWidgetUrl: string
  displayWidgetUrl: string
}

export interface SpeechToTextWsData {
  event: string
  data: SpeechToTextWsInitData
}

export interface SpeechToTextSaveEventData {
  event: "save"
  settings: SpeechToTextModuleSettings
}

export const default_settings = (obj: any = null): SpeechToTextModuleSettings => ({
  status: {
    enabled: getProp(obj, ['status', 'enabled'], false),
  },
  styles: {
    // page background color
    bgColor: getProp(obj, ['styles', 'bgColor'], '#ff00ff'),
    bgColorEnabled: getProp(obj, ['styles', 'bgColorEnabled'], true),
    // vertical align of text (top|bottom)
    vAlign: getProp(obj, ['styles', 'vAlign'], 'bottom'),

    // recognized text
    recognition: {
      fontFamily: getProp(obj, ['styles', 'recognition', 'fontFamily'], 'sans-serif'),
      fontSize: getProp(obj, ['styles', 'recognition', 'fontSize'], '30pt'),
      fontWeight: getProp(obj, ['styles', 'recognition', 'fontWeight'], '400'),
      strokeWidth: getProp(obj, ['styles', 'recognition', 'strokeWidth'], '8pt'),
      strokeColor: getProp(obj, ['styles', 'recognition', 'strokeColor'], '#292929'),
      color: getProp(obj, ['styles', 'recognition', 'color'], '#ffff00'),
    },

    // translated text
    translation: {
      fontFamily: getProp(obj, ['styles', 'translation', 'fontFamily'], 'sans-serif'),
      fontSize: getProp(obj, ['styles', 'translation', 'fontSize'], '30pt'),
      fontWeight: getProp(obj, ['styles', 'translation', 'fontWeight'], '400'),
      strokeWidth: getProp(obj, ['styles', 'translation', 'strokeWidth'], '8pt'),
      strokeColor: getProp(obj, ['styles', 'translation', 'strokeColor'], '#292929'),
      color: getProp(obj, ['styles', 'translation', 'color'], '#cbcbcb'),
    }
  },
  recognition: {
    display: getProp(obj, ['recognition', 'display'], true),
    lang: getProp(obj, ['recognition', 'lang'], 'ja'),
    synthesize: getProp(obj, ['recognition', 'synthesize'], false),
    synthesizeLang: getProp(obj, ['recognition', 'synthesizeLang'], ''),
  },
  translation: {
    enabled: getProp(obj, ['translation', 'enabled'], true),
    langSrc: getProp(obj, ['translation', 'langSrc'], 'ja'),
    langDst: getProp(obj, ['translation', 'langDst'], 'en'),
    synthesize: getProp(obj, ['translation', 'synthesize'], false),
    synthesizeLang: getProp(obj, ['translation', 'synthesizeLang'], ''),
  },
})
