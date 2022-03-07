<template>
  <div id="app">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
        <button
          class="button is-small is-primary mr-1"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
        <a class="button is-small" :href="controlWidgetUrl" target="_blank"
          >Open control widget</a
        >
        <a class="button is-small mr-1" :href="displayWidgetUrl" target="_blank"
          >Open display widget</a
        >
      </div>
    </div>
    <div id="main" ref="main">
      <table class="table is-striped" ref="table" v-if="inited">
        <tbody>
          <tr>
            <td colspan="3">General</td>
          </tr>
          <tr>
            <td><code>settings.style.bgColor</code></td>
            <td>
              <input
                class="input is-small"
                type="color"
                v-model="settings.styles.bgColor"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.style.vAlign</code></td>
            <td>
              <div class="select is-small">
                <select v-model="settings.styles.vAlign">
                  <option value="top">top</option>
                  <option value="bottom">bottom</option>
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>

          <tr>
            <td colspan="3">Recognition</td>
          </tr>
          <tr>
            <td><code>settings.recognition.lang</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.recognition.lang"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.recognition.synthesize</code></td>
            <td>
              <input
                class="is-small"
                type="checkbox"
                v-model="settings.recognition.synthesize"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.recognition.synthesizeLang</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.recognition.synthesizeLang"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.recognition.display</code></td>
            <td>
              <input
                class="is-small"
                type="checkbox"
                v-model="settings.recognition.display"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.color</code></td>
            <td>
              <input
                class="input is-small"
                type="color"
                v-model="settings.styles.recognition.color"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.strokeWidth</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.styles.recognition.strokeWidth"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.strokeColor</code></td>
            <td>
              <input
                class="input is-small"
                type="color"
                v-model="settings.styles.recognition.strokeColor"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.fontFamily</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.styles.recognition.fontFamily"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.fontSize</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.styles.recognition.fontSize"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.recognition.fontWeight</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.styles.recognition.fontWeight"
              />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.recognition.fontWeight ===
                  defaultSettings.styles.recognition.fontWeight
                "
                @click="settings.styles.weight = defaultSettings.styles.weight"
              >
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>

          <tr>
            <td colspan="3">Translation</td>
          </tr>
          <tr>
            <td><code>settings.translation.enabled</code></td>
            <td>
              <input
                class="is-small"
                type="checkbox"
                v-model="settings.translation.enabled"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.synthesize</code></td>
            <td>
              <input
                class="is-small"
                type="checkbox"
                v-model="settings.translation.synthesize"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.synthesizeLang</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.translation.synthesizeLang"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.langSrc</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.translation.langSrc"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.translation.langDst</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.translation.langDst"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.color</code></td>
            <td>
              <input
                class="input is-small"
                type="color"
                v-model="settings.styles.translation.color"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.strokeWidth</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.styles.translation.strokeWidth"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.strokeColor</code></td>
            <td>
              <input
                class="input is-small"
                type="color"
                v-model="settings.styles.translation.strokeColor"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.fontFamily</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.styles.translation.fontFamily"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.fontSize</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.styles.translation.fontSize"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.styles.translation.fontWeight</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.styles.translation.fontWeight"
              />
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.translation.fontWeight ===
                  defaultSettings.styles.translation.fontWeight
                "
                @click="settings.styles.weight = defaultSettings.styles.weight"
              >
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>

          <tr>
            <td colspan="3">Debug</td>
          </tr>
          <tr>
            <td><code>settings.status.enabled</code></td>
            <td>
              <input
                class="is-small"
                type="checkbox"
                v-model="settings.status.enabled"
              />
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
                <i class="fa fa-remove"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import WsClient from "../WsClient";
import {
  default_settings,
  SpeechToTextModuleSettings,
  SpeechToTextSaveEventData,
  SpeechToTextWsInitData,
} from "../../mod/modules/SpeechToTextModuleCommon";
import util from "../util";

interface ComponentData {
  unchangedJson: string;
  changedJson: string;
  settings: SpeechToTextModuleSettings;
  defaultSettings: SpeechToTextModuleSettings;
  ws: WsClient | null;
  inited: boolean;
}

export default defineComponent({
  data: (): ComponentData => ({
    unchangedJson: "{}",
    changedJson: "{}",
    settings: default_settings(),
    defaultSettings: default_settings(),
    ws: null,
    inited: false,
  }),
  watch: {
    settings: {
      deep: true,
      handler(ch) {
        this.changedJson = JSON.stringify(ch);
      },
    },
  },
  computed: {
    changed(): boolean {
      return this.unchangedJson !== this.changedJson;
    },
    controlWidgetUrl(): string {
      return util.widgetUrl("speech-to-text");
    },
    displayWidgetUrl(): string {
      return util.widgetUrl("speech-to-text_receive");
    },
  },
  methods: {
    sendSave() {
      if (!this.settings) {
        console.warn("sendSave: this.settings not initialized");
        return;
      }
      this.sendMsg({ event: "save", settings: this.settings });
    },
    sendMsg(data: SpeechToTextSaveEventData) {
      if (!this.ws) {
        console.warn("sendMsg: this.ws not initialized");
        return;
      }
      this.ws.send(JSON.stringify(data));
    },
  },
  async mounted() {
    this.ws = util.wsClient("speech-to-text");
    this.ws.onMessage("init", (data: SpeechToTextWsInitData) => {
      this.settings = data.settings;
      this.unchangedJson = JSON.stringify(data.settings);
      this.inited = true;
    });
    this.ws.connect();
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect();
    }
  },
});
</script>
