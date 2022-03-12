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

export const default_settings = (obj: any = null): SpeechToTextModuleSettings => ({
  status: {
    enabled: typeof obj?.status?.enabled !== 'undefined' ? obj.status.enabled : false,
  },
  styles: {
    // page background color
    bgColor: typeof obj?.styles?.bgColor !== 'undefined' ? obj.styles.bgColor : '#ff00ff',
    bgColorEnabled: typeof obj?.styles?.bgColorEnabled !== 'undefined' ? obj.styles.bgColorEnabled : true,
    // vertical align of text
    vAlign: typeof obj?.styles?.vAlign !== 'undefined' ? obj.styles.vAlign : 'bottom', // top|bottom

    // recognized text
    recognition: {
      fontFamily: typeof obj?.styles?.recognition?.fontFamily !== 'undefined' ? obj.styles.recognition.fontFamily : 'sans-serif',
      fontSize: typeof obj?.styles?.recognition?.fontSize !== 'undefined' ? obj.styles.recognition.fontSize : '30pt',
      fontWeight: typeof obj?.styles?.recognition?.fontWeight !== 'undefined' ? obj.styles.recognition.fontWeight : '400',
      strokeWidth: typeof obj?.styles?.recognition?.strokeWidth !== 'undefined' ? obj.styles.recognition.strokeWidth : '8pt',
      strokeColor: typeof obj?.styles?.recognition?.strokeColor !== 'undefined' ? obj.styles.recognition.strokeColor : '#292929',
      color: typeof obj?.styles?.recognition?.color !== 'undefined' ? obj.styles.recognition.color : '#ffff00',
    },

    // translated text
    translation: {
      fontFamily: typeof obj?.styles?.translation?.fontFamily !== 'undefined' ? obj.styles.translation.fontFamily : 'sans-serif',
      fontSize: typeof obj?.styles?.translation?.fontSize !== 'undefined' ? obj.styles.translation.fontSize : '30pt',
      fontWeight: typeof obj?.styles?.translation?.fontWeight !== 'undefined' ? obj.styles.translation.fontWeight : '400',
      strokeWidth: typeof obj?.styles?.translation?.strokeWidth !== 'undefined' ? obj.styles.translation.strokeWidth : '8pt',
      strokeColor: typeof obj?.styles?.translation?.strokeColor !== 'undefined' ? obj.styles.translation.strokeColor : '#292929',
      color: typeof obj?.styles?.translation?.color !== 'undefined' ? obj.styles.translation.color : '#cbcbcb',
    }
  },
  recognition: {
    display: typeof obj?.recognition?.display !== 'undefined' ? obj.recognition.display : true,
    lang: typeof obj?.recognition?.lang !== 'undefined' ? obj.recognition.lang : 'ja',
    synthesize: typeof obj?.recognition?.synthesize !== 'undefined' ? obj.recognition.synthesize : false,
    synthesizeLang: typeof obj?.recognition?.synthesizeLang !== 'undefined' ? obj.recognition.synthesizeLang : '',
  },
  translation: {
    enabled: typeof obj?.translation?.enabled !== 'undefined' ? obj.translation.enabled : true,
    langSrc: typeof obj?.translation?.langSrc !== 'undefined' ? obj.translation.langSrc : 'ja',
    langDst: typeof obj?.translation?.langDst !== 'undefined' ? obj.translation.langDst : 'en',
    synthesize: typeof obj?.translation?.synthesize !== 'undefined' ? obj.translation.synthesize : false,
    synthesizeLang: typeof obj?.translation?.synthesizeLang !== 'undefined' ? obj.translation.synthesizeLang : '',
  },
})
