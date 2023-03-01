<template>
  <div
    v-if="settings"
    class="big"
  >
    <div v-if="settings.status.enabled">
      {{ status }}
      <div v-if="errors.length > 0">
        <div>Latest errors:</div>
        <ul>
          <li
            v-for="(error, idx) in errors"
            :key="idx"
          >
            {{ error }}
          </li>
        </ul>
      </div>
    </div>
    <button
      v-if="controls && wantsSpeech && !initedSpeech"
      @click="initSpeech"
    >
      Enable Speech Synthesis
    </button>
    <table
      ref="textTable"
      class="btm_table"
    >
      <tr>
        <td
          align="center"
          valign="bottom"
        >
          <div
            v-if="settings.recognition.display"
            ref="speechTextBg"
            class="stroke-single-bg"
          >
            {{ recognizedText }}
          </div>
          <div
            v-if="settings.recognition.display"
            ref="speechTextFg"
            class="stroke-single-fg"
          >
            {{ recognizedText }}
          </div>
          <div
            v-if="settings.recognition.display"
            ref="speechTextImb"
            class="stroke-single-imb"
          >
            {{ recognizedText }}
          </div>

          <div
            v-if="settings.translation.enabled"
            ref="transTextBg"
            class="stroke-single-bg"
          >
            {{ translatedText }}
          </div>
          <div
            v-if="settings.translation.enabled"
            ref="transTextFg"
            class="stroke-single-fg"
          >
            {{ translatedText }}
          </div>
          <div
            v-if="settings.translation.enabled"
            ref="transTextImb"
            class="stroke-single-imb"
          >
            {{ translatedText }}
          </div>
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, Ref, ref } from 'vue'
import util, { WidgetApiData } from '../util'
import {
  calculateOptimalSubtitleDisplayTimeMs,
  clamp,
  logger,
  SECOND,
  toNumberUnitString,
} from '../../../common/fn'
import WsClient from '../../WsClient'
import { SpeechToTextModuleSettings, SpeechToTextModuleStylesPack, SpeechToTextWsInitData } from '../../../mod/modules/SpeechToTextModuleCommon'

const log = logger('speech-to-text/Page.vue')

// in brave treat insecure as secure to allow mic locally:
//   brave://flags/#unsafely-treat-insecure-origin-as-secure

let ws: WsClient | null = null
const status = ref<string>('')
const errors = ref<string[]>([])
const initedSpeech = ref<boolean>(false)
// prevent doing things twice
const lastUtterance = ref<string>('')
const recognition = ref<{ interimResults: boolean, continuous: boolean }>({
  interimResults: false,
  continuous: true,
})
// texts
const texts = ref<{ recognized: string; translated: string; ready: boolean }[]>([])
const timeout = ref<any>(null)
// settings (overwritten from data ws)
const settings = ref<SpeechToTextModuleSettings | null>(null)
// speech recognition object
const srObj = ref<any>(null)

const props = defineProps<{
  controls: boolean,
  wdata: WidgetApiData,
}>()

const recognizedText = computed((): string => {
  if (texts.value.length === 0 || !texts.value[0].ready) {
    return ''
  }
  return texts.value[0].recognized
})
const translatedText = computed((): string => {
  if (texts.value.length === 0 || !texts.value[0].ready) {
    return ''
  }
  return texts.value[0].translated
})
const lastRecognizedText = computed((): string => {
  if (texts.value.length === 0) {
    return ''
  }
  return texts.value[texts.value.length - 1].recognized
})
const wantsSpeech = computed((): boolean => {
  if (!settings.value) {
    return false
  }
  return (
    settings.value.recognition.synthesize ||
    settings.value.translation.synthesize
  )
})

const textTable = ref<HTMLTableElement>() as Ref<HTMLTableElement>
const speechTextImb = ref<HTMLDivElement>() as Ref<HTMLDivElement>
const speechTextFg = ref<HTMLDivElement>() as Ref<HTMLDivElement>
const speechTextBg = ref<HTMLDivElement>() as Ref<HTMLDivElement>
const transTextImb = ref<HTMLDivElement>() as Ref<HTMLDivElement>
const transTextFg = ref<HTMLDivElement>() as Ref<HTMLDivElement>
const transTextBg = ref<HTMLDivElement>() as Ref<HTMLDivElement>

// @ts-ignore
import('./main.css')

const initSpeech = (): void => {
  log.info(speechSynthesis)
  speechSynthesis.cancel()
  speechSynthesis.resume()
  initedSpeech.value = true
}

const _next = (): void => {
  if (timeout.value) {
    log.info('_next(): timeout still active')
    return
  }
  if (!recognizedText.value && !translatedText.value) {
    log.info('_next(): recognizedText and translatedText empty')
    return
  }
  if (!settings.value) {
    log.info('_next(): settings empty')
    return
  }

  // TODO: queue synthesizations
  if (recognizedText.value && settings.value.recognition.synthesize) {
    log.info('synthesizing recognized text')
    synthesize(
      recognizedText.value,
      settings.value.recognition.synthesizeLang,
    )
  }
  if (translatedText.value && settings.value.translation.synthesize) {
    log.info('synthesizing translated text')
    synthesize(
      translatedText.value,
      settings.value.translation.synthesizeLang,
    )
  }

  timeout.value = setTimeout(() => {
    texts.value.shift()
    timeout.value = null
    _next()
  }, calculateSubtitleDisplayTime(`${recognizedText.value} ${translatedText.value}`))
}

const calculateSubtitleDisplayTime = (text: string): number => {
  const durationMs = calculateOptimalSubtitleDisplayTimeMs(text)
  return clamp(2 * SECOND, durationMs, 10 * SECOND)
}

const synthesize = (text: string, lang: string): void => {
  log.info({ lastUtterance: lastUtterance.value, text, lang }, 'synthesize')
  if (lastUtterance.value !== text) {
    log.info({ speechSynthesis }, 'speechSynthesis')
    lastUtterance.value = text
    let utterance = new SpeechSynthesisUtterance(`${lastUtterance.value}`)
    if (lang) {
      utterance.lang = lang
    }
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  }
}

const applyStyles = (): void => {
  if (!settings.value) {
    log.info('applyStyles(): settings empty')
    return
  }
  const styles = settings.value.styles

  const bgColor = (styles.bgColorEnabled && styles.bgColor != null) ? styles.bgColor : ''
  document.body.style.backgroundColor = bgColor

  if (styles.vAlign === 'top') {
    // need to be set to null in order for style to become empty
    // aka bottom style be removed completely
    // @ts-ignore
    textTable.value.style.bottom = null
  } else if (styles.vAlign === 'bottom') {
    textTable.value.style.bottom = '0px'
  }

  const applyTextStyles = (
    imb: HTMLDivElement,
    fg: HTMLDivElement,
    bg: HTMLDivElement,
    styles: SpeechToTextModuleStylesPack,
    bgColor: string,
  ) => {
    if (styles.color != null) {
      fg.style.color = styles.color
    }

    imb.style.webkitTextStrokeColor = bgColor
    if (styles.strokeWidth != null) {
      const strokeWidth = toNumberUnitString(styles.strokeWidth)
      imb.style.webkitTextStrokeWidth = strokeWidth
      bg.style.webkitTextStrokeWidth = strokeWidth
    }

    if (styles.strokeColor != null) {
      bg.style.webkitTextStrokeColor = styles.strokeColor
    }

    if (styles.fontFamily != null) {
      imb.style.fontFamily = styles.fontFamily
      fg.style.fontFamily = styles.fontFamily
      bg.style.fontFamily = styles.fontFamily
    }
    if (styles.fontSize != null) {
      const fontSize = toNumberUnitString(styles.fontSize)
      imb.style.fontSize = fontSize
      fg.style.fontSize = fontSize
      bg.style.fontSize = fontSize
    }
    if (styles.fontWeight != null) {
      imb.style.fontWeight = styles.fontWeight
      fg.style.fontWeight = styles.fontWeight
      bg.style.fontWeight = styles.fontWeight
    }
  }

  // RECOGNIZED TEXT
  if (settings.value.recognition.display) {
    applyTextStyles(
      speechTextImb.value,
      speechTextFg.value,
      speechTextBg.value,
      styles.recognition,
      bgColor,
    )
  }

  // TRANSLATED TEXT
  if (settings.value.translation.enabled) {
    applyTextStyles(
      transTextImb.value,
      transTextFg.value,
      transTextBg.value,
      styles.translation,
      bgColor,
    )
  }
}

const initVoiceRecognition = (): void => {
  if (!props.controls) {
    return
  }
  if (!settings.value) {
    log.info('initVoiceRecognition(): settings empty')
    return
  }
  // ignore because neither SpeechRecognition nor webkitSpeechRecognition
  // are known to typescript :(
  // @ts-ignore
  const r = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!r) {
    alert(
      'This widget does not work in this browser. Try a chrome based browser.',
    )
    return
  }
  if (srObj.value) {
    srObj.value.abort()
    srObj.value.stop()
  }

  srObj.value = new r()
  srObj.value.lang = settings.value.recognition.lang
  srObj.value.interimResults = recognition.value.interimResults
  srObj.value.continuous = recognition.value.continuous

  srObj.value.onsoundstart = () => {
    status.value = 'Sound started'
  }
  srObj.value.onnomatch = () => {
    status.value = 'No match'
  }
  srObj.value.onerror = (evt: any) => {
    status.value = 'Error'
    errors.value.unshift(evt.error)
    errors.value = errors.value.slice(0, 10)
    initVoiceRecognition()
  }
  srObj.value.onsoundend = () => {
    status.value = 'Sound ended'
    initVoiceRecognition()
  }
  srObj.value.onspeechend = () => {
    status.value = 'Speech ended'
    initVoiceRecognition()
  }
  srObj.value.onresult = async (evt: any) => {
    onVoiceResult(evt)
    initVoiceRecognition()
  }
  srObj.value.start()
}

const onVoiceResult = (evt: any): void => {
  if (!ws) {
    log.error('onVoiceResult: ws not set')
    return
  }
  let results = evt.results
  log.info({ evt }, 'onVoiceResult()')
  for (var i = evt.resultIndex; i < results.length; i++) {
    if (!results[i].isFinal) {
      // recognizedText = "<<" + _recognizedText + ">>";
      // translatedText = "<<...>>";
      continue
    }

    const _recognizedText = results[i][0].transcript
    if (lastRecognizedText.value === _recognizedText) {
      continue
    }

    ws.send(
      JSON.stringify({
        event: 'onVoiceResult',
        text: _recognizedText,
      }),
    )
    break
  }
}

onMounted(() => {
  ws = util.wsClient(props.wdata)
  ws.onMessage('text', (data: { recognized: string, translated: string }) => {
    texts.value.push({
      recognized: data.recognized,
      translated: data.translated,
      ready: true,
    })
    _next()
  })
  ws.onMessage('init', (data: SpeechToTextWsInitData) => {
    settings.value = data.settings
    nextTick(() => {
      applyStyles()
      initVoiceRecognition()
    })
  })
  ws.connect()
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
