<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <NavbarElement />
      <div
        id="actionbar"
        class="p-1"
      >
        <button
          class="button is-small is-primary mr-1"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
        <a
          class="button is-small mr-1"
          :href="controlWidgetUrl"
          target="_blank"
        >Open control widget</a>
        <a
          class="button is-small mr-1"
          :href="displayWidgetUrl"
          target="_blank"
        >Open display widget</a>
      </div>
    </div>
    <div
      id="main"
      ref="main"
    >
      <table
        v-if="inited"
        ref="table"
        class="table is-striped"
      >
        <tbody>
          <tr>
            <td colspan="3">
              General
            </td>
          </tr>
          <tr>
            <td><code>settings.style.bgColor</code></td>
            <td>
              <input
                v-model="settings.styles.bgColor"
                class="input is-small"
                type="color"
              >
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.bgColor === defaultSettings.styles.bgColor
                "
                @click="
                  settings.styles.bgColor = defaultSettings.styles.bgColor
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.style.bgColorEnabled</code></td>
            <td>
              <CheckboxInput v-model="settings.styles.bgColorEnabled" />
            </td>
          </tr>
          <tr>
            <td><code>settings.style.vAlign</code></td>
            <td>
              <div class="select is-small">
                <select v-model="settings.styles.vAlign">
                  <option value="top">
                    top
                  </option>
                  <option value="bottom">
                    bottom
                  </option>
                </select>
              </div>
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.vAlign === defaultSettings.styles.vAlign
                "
                @click="settings.styles.vAlign = defaultSettings.styles.vAlign"
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>

          <tr>
            <td colspan="3">
              Recognition
            </td>
          </tr>
          <tr>
            <td><code>settings.recognition.lang</code></td>
            <td>
              <StringInput v-model="settings.recognition.lang" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.recognition.lang === defaultSettings.recognition.lang
                "
                @click="
                  settings.recognition.lang = defaultSettings.recognition.lang
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.recognition.synthesize</code></td>
            <td>
              <CheckboxInput v-model="settings.recognition.synthesize" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.recognition.synthesize ===
                    defaultSettings.recognition.synthesize
                "
                @click="
                  settings.translation.enabled =
                    defaultSettings.translation.enabled
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.recognition.synthesizeLang</code></td>
            <td>
              <StringInput v-model="settings.recognition.synthesizeLang" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.recognition.synthesizeLang ===
                    defaultSettings.recognition.synthesizeLang
                "
                @click="
                  settings.recognition.synthesizeLang =
                    defaultSettings.recognition.synthesizeLang
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.recognition.display</code></td>
            <td>
              <CheckboxInput v-model="settings.recognition.display" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.recognition.display ===
                    defaultSettings.recognition.display
                "
                @click="
                  settings.recognition.display =
                    defaultSettings.recognition.display
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.color</code></td>
            <td>
              <input
                v-model="settings.styles.recognition.color"
                class="input is-small"
                type="color"
              >
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.recognition.color ===
                    defaultSettings.styles.recognition.color
                "
                @click="
                  settings.styles.recognition.color =
                    defaultSettings.styles.recognition.color
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.strokeWidth</code></td>
            <td>
              <StringInput v-model="settings.styles.recognition.strokeWidth" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.recognition.strokeWidth ===
                    defaultSettings.styles.recognition.strokeWidth
                "
                @click="
                  settings.styles.recognition.strokeWidth =
                    defaultSettings.styles.recognition.strokeWidth
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.strokeColor</code></td>
            <td>
              <input
                v-model="settings.styles.recognition.strokeColor"
                class="input is-small"
                type="color"
              >
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.recognition.strokeColor ===
                    defaultSettings.styles.recognition.strokeColor
                "
                @click="
                  settings.styles.recognition.strokeColor =
                    defaultSettings.styles.recognition.strokeColor
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.fontFamily</code></td>
            <td>
              <StringInput v-model="settings.styles.recognition.fontFamily" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.recognition.fontFamily ===
                    defaultSettings.styles.recognition.fontFamily
                "
                @click="
                  settings.styles.recognition.fontFamily =
                    defaultSettings.styles.recognition.fontFamily
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.fontSize</code></td>
            <td>
              <StringInput v-model="settings.styles.recognition.fontSize" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.recognition.fontSize ===
                    defaultSettings.styles.recognition.fontSize
                "
                @click="
                  settings.styles.recognition.fontSize =
                    defaultSettings.styles.recognition.fontSize
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.fontWeight</code></td>
            <td>
              <StringInput v-model="settings.styles.recognition.fontWeight" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.recognition.fontWeight ===
                    defaultSettings.styles.recognition.fontWeight
                "
                @click="settings.styles.recognition.fontWeight = defaultSettings.styles.recognition.fontWeight"
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>

          <tr>
            <td colspan="3">
              Translation
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.enabled</code></td>
            <td>
              <CheckboxInput v-model="settings.translation.enabled" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.translation.enabled ===
                    defaultSettings.translation.enabled
                "
                @click="
                  settings.translation.enabled =
                    defaultSettings.translation.enabled
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.synthesize</code></td>
            <td>
              <CheckboxInput v-model="settings.translation.synthesize" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.translation.synthesize ===
                    defaultSettings.translation.synthesize
                "
                @click="
                  settings.translation.synthesize =
                    defaultSettings.translation.synthesize
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.synthesizeLang</code></td>
            <td>
              <StringInput v-model="settings.translation.synthesizeLang" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.translation.synthesizeLang ===
                    defaultSettings.translation.synthesizeLang
                "
                @click="
                  settings.translation.synthesizeLang =
                    defaultSettings.translation.synthesizeLang
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.langSrc</code></td>
            <td>
              <StringInput v-model="settings.translation.langSrc" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.translation.langSrc ===
                    defaultSettings.translation.langSrc
                "
                @click="
                  settings.translation.langSrc =
                    defaultSettings.translation.langSrc
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.langDst</code></td>
            <td>
              <StringInput v-model="settings.translation.langDst" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.translation.langDst ===
                    defaultSettings.translation.langDst
                "
                @click="
                  settings.translation.langDst =
                    defaultSettings.translation.langDst
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.color</code></td>
            <td>
              <input
                v-model="settings.styles.translation.color"
                class="input is-small"
                type="color"
              >
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.translation.color ===
                    defaultSettings.styles.translation.color
                "
                @click="
                  settings.styles.translation.color =
                    defaultSettings.styles.translation.color
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.strokeWidth</code></td>
            <td>
              <StringInput v-model="settings.styles.translation.strokeWidth" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.translation.strokeWidth ===
                    defaultSettings.styles.translation.strokeWidth
                "
                @click="
                  settings.styles.translation.strokeWidth =
                    defaultSettings.styles.translation.strokeWidth
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.strokeColor</code></td>
            <td>
              <input
                v-model="settings.styles.translation.strokeColor"
                class="input is-small"
                type="color"
              >
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.translation.strokeColor ===
                    defaultSettings.styles.translation.strokeColor
                "
                @click="
                  settings.styles.translation.strokeColor =
                    defaultSettings.styles.translation.strokeColor
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.fontFamily</code></td>
            <td>
              <StringInput v-model="settings.styles.translation.fontFamily" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.translation.fontFamily ===
                    defaultSettings.styles.translation.fontFamily
                "
                @click="
                  settings.styles.translation.fontFamily =
                    defaultSettings.styles.translation.fontFamily
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.fontSize</code></td>
            <td>
              <StringInput v-model="settings.styles.translation.fontSize" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.translation.fontSize ===
                    defaultSettings.styles.translation.fontSize
                "
                @click="
                  settings.styles.translation.fontSize =
                    defaultSettings.styles.translation.fontSize
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.fontWeight</code></td>
            <td>
              <StringInput v-model="settings.styles.translation.fontWeight" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.translation.fontWeight ===
                    defaultSettings.styles.translation.fontWeight
                "
                @click="settings.styles.translation.fontWeight = defaultSettings.styles.translation.fontWeight"
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>

          <tr>
            <td colspan="3">
              Debug
            </td>
          </tr>
          <tr>
            <td><code>settings.status.enabled</code></td>
            <td>
              <CheckboxInput v-model="settings.status.enabled" />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.status.enabled === defaultSettings.status.enabled
                "
                @click="
                  settings.status.enabled = defaultSettings.status.enabled
                "
              >
                <i class="fa fa-remove" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import WsClient from '../WsClient'
import {
  default_settings,
  SpeechToTextModuleSettings,
  SpeechToTextSaveEventData,
  SpeechToTextWsInitData,
} from '../../mod/modules/SpeechToTextModuleCommon'
import util from '../util'
import StringInput from '../components/StringInput.vue'
import CheckboxInput from '../components/CheckboxInput.vue'
import NavbarElement from '../components/NavbarElement.vue'

const unchangedJson = ref<string>('{}')
const changedJson = ref<string>('{}')
const settings = ref<SpeechToTextModuleSettings>(default_settings())
const defaultSettings = ref<SpeechToTextModuleSettings>(default_settings())
const inited = ref<boolean>(false)
const controlWidgetUrl = ref<string>('')
const displayWidgetUrl = ref<string>('')

let ws: WsClient | null = null

const sendSave = () => {
  if (!settings.value) {
    console.warn('sendSave: settings not initialized')
    return
  }
  sendMsg({ event: 'save', settings: settings.value })
}

const sendMsg = (data: SpeechToTextSaveEventData) => {
  if (!ws) {
    console.warn('sendMsg: ws not initialized')
    return
  }
  ws.send(JSON.stringify(data))
}

const changed = computed((): boolean => {
  return unchangedJson.value !== changedJson.value
})

watch(settings, (newValue) => {
  changedJson.value = JSON.stringify(newValue)
}, { deep: true })

onMounted(async () => {
  ws = util.wsClient('speech-to-text')
  ws.onMessage('init', (data: SpeechToTextWsInitData) => {
    settings.value = data.settings
    unchangedJson.value = JSON.stringify(data.settings)
    controlWidgetUrl.value = data.controlWidgetUrl
    displayWidgetUrl.value = data.displayWidgetUrl
    inited.value = true
  })
  ws.connect()
})

onBeforeUnmount(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
