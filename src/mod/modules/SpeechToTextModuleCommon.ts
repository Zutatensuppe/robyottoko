export interface SpeechToTextModuleSettings {
  status: {
    enabled: boolean
  }
  styles: {
    // page background color
    bgColor: string
    // vertical align of text
    vAlign: 'bottom' | 'top' | 'bottom'

    // recognized text
    recognition: {
      fontFamily: string
      fontSize: string
      fontWeight: string
      strokeWidth: string
      strokeColor: string
      color: string
    }

    // translated text
    translation: {
      fontFamily: string
      fontSize: string
      fontWeight: string
      strokeWidth: string
      strokeColor: string
      color: string
    }
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
}

export interface SpeechToTextWsData {
  event: string
  data: SpeechToTextWsInitData
}

export interface SpeechToTextSaveEventData {
  event: "save"
  settings: SpeechToTextModuleSettings
}

export const default_settings = (): SpeechToTextModuleSettings => ({
  status: {
    enabled: false,
  },
  styles: {
    // page background color
    bgColor: '#ff00ff',
    // vertical align of text
    vAlign: 'bottom', // top|bottom

    // recognized text
    recognition: {
      fontFamily: 'sans-serif',
      fontSize: '30',
      fontWeight: '400',
      strokeWidth: '8',
      strokeColor: '#292929',
      color: '#ffff00',
    },

    // translated text
    translation: {
      fontFamily: 'sans-serif',
      fontSize: '30',
      fontWeight: '400',
      strokeWidth: '8',
      strokeColor: '#292929',
      color: '#cbcbcb',
    }
  },
  recognition: {
    display: true,
    lang: 'ja',
    synthesize: false,
    synthesizeLang: '',
  },
  translation: {
    enabled: true,
    langSrc: 'ja',
    langDst: 'en',
    synthesize: false,
    synthesizeLang: '',
  },
})
