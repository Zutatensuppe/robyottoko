<template>
  <div class="big" ref="result_text" v-if="settings">
    <div v-if="settings.status.enabled">
      {{ status }}
      <div v-if="errors.length > 0">
        <div>Latest errors:</div>
        <ul>
          <li v-for="(error, idx) in errors" :key="idx">{{ error }}</li>
        </ul>
      </div>
    </div>
    <button @click="initSpeech" v-if="controls && wantsSpeech && !initedSpeech">
      Enable Speech Synthesis
    </button>
    <table ref="text_table" class="btm_table">
      <tr>
        <td align="center" valign="bottom">
          <div v-if="settings.recognition.display" class="stroke-single-bg" ref="speech_text-bg">
            {{ recognizedText }}
          </div>
          <div v-if="settings.recognition.display" class="stroke-single-fg" ref="speech_text-fg">
            {{ recognizedText }}
          </div>
          <div v-if="settings.recognition.display" class="stroke-single-imb" ref="speech_text-imb">
            {{ recognizedText }}
          </div>

          <div v-if="settings.translation.enabled" class="stroke-single-bg" ref="trans_text-bg">
            {{ translatedText }}
          </div>
          <div v-if="settings.translation.enabled" class="stroke-single-fg" ref="trans_text-fg">
            {{ translatedText }}
          </div>
          <div v-if="settings.translation.enabled" class="stroke-single-imb" ref="trans_text-imb">
            {{ translatedText }}
          </div>
        </td>
      </tr>
    </table>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import util from "../util";
import {
  calculateOptimalSubtitleDisplayTimeMs,
  logger,
  toNumberUnitString,
} from "../../common/fn";
import WsClient from "../../frontend/WsClient";
import { SpeechToTextModuleSettings, SpeechToTextWsInitData } from "../../mod/modules/SpeechToTextModuleCommon";
const log = logger("speech-to-text/Page.vue");

// in brave treat insecure as secure to allow mic locally:
//   brave://flags/#unsafely-treat-insecure-origin-as-secure

interface ComponentData {
  ws: WsClient | null
  status: string
  errors: string[]
  initedSpeech: boolean
  lastUtterance: string
  recognition: {
    interimResults: boolean
    continuous: boolean
  }
  texts: { recognized: string; translated: string; ready: boolean }[]
  timeout: any // null | number
  settings: SpeechToTextModuleSettings | null
  srObj: any // speech recognition object
}

export default defineComponent({
  props: {
    controls: { type: Boolean, required: true },
    widget: { type: String, required: true },
  },
  data: (): ComponentData => ({
    ws: null as WsClient | null,
    status: "",
    errors: [] as string[],

    initedSpeech: false,

    // prevent doing things twice
    lastUtterance: "",

    recognition: {
      interimResults: false,
      continuous: true,
    },

    // texts
    texts: [] as { recognized: string; translated: string; ready: boolean }[],
    timeout: null, // null | number

    // settings (overwritten from data ws)
    settings: null,

    srObj: null as any,
  }),
  computed: {
    recognizedText(): string {
      if (this.texts.length === 0 || !this.texts[0].ready) {
        return "";
      }
      return this.texts[0].recognized;
    },
    translatedText(): string {
      if (this.texts.length === 0 || !this.texts[0].ready) {
        return "";
      }
      return this.texts[0].translated;
    },
    lastRecognizedText(): string {
      if (this.texts.length === 0) {
        return "";
      }
      return this.texts[this.texts.length - 1].recognized;
    },
    wantsSpeech(): boolean {
      if (!this.settings) {
        return false
      }
      return (
        this.settings.recognition.synthesize ||
        this.settings.translation.synthesize
      );
    },
    textTable(): HTMLTableElement {
      return this.$refs["text_table"] as HTMLTableElement
    },
  },
  methods: {
    initSpeech(): void {
      log.log(speechSynthesis);
      speechSynthesis.cancel();
      speechSynthesis.resume();
      this.initedSpeech = true;
    },
    _next(): void {
      if (this.timeout) {
        log.info("_next(): timeout still active");
        return;
      }
      if (!this.recognizedText && !this.translatedText) {
        log.info("_next(): recognizedText and translatedText empty");
        return;
      }
      if (!this.settings) {
        log.info("_next(): settings empty");
        return;
      }

      // TODO: queue synthesizations
      if (this.recognizedText && this.settings.recognition.synthesize) {
        log.info("synthesizing recognized text");
        this.synthesize(
          this.recognizedText,
          this.settings.recognition.synthesizeLang
        );
      }
      if (this.translatedText && this.settings.translation.synthesize) {
        log.info("synthesizing translated text");
        this.synthesize(
          this.translatedText,
          this.settings.translation.synthesizeLang
        );
      }

      this.timeout = setTimeout(() => {
        this.texts.shift();
        this.timeout = null;
        this._next();
      }, this.calculateSubtitleDisplayTime(`${this.recognizedText} ${this.translatedText}`));
    },
    calculateSubtitleDisplayTime(text: string): number {
      const durationMs = calculateOptimalSubtitleDisplayTimeMs(text);
      // clamp duration between 1s and 10s
      return Math.min(10000, Math.max(2000, durationMs));
    },
    synthesize(text: string, lang: string): void {
      log.info("synthesize", this.lastUtterance, text, lang);
      if (this.lastUtterance !== text) {
        log.info("speechSynthesis", speechSynthesis);
        this.lastUtterance = text;
        let utterance = new SpeechSynthesisUtterance(`${this.lastUtterance}`);
        if (lang) {
          utterance.lang = lang;
        }
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }
    },
    applyStyles(): void {
      if (!this.settings) {
        log.info("applyStyles(): settings empty");
        return;
      }
      const styles = this.settings.styles;

      if (styles.bgColorEnabled && styles.bgColor != null) {
        document.body.style.backgroundColor = styles.bgColor;
      } else {
        document.body.style.backgroundColor = "";
      }

      if (styles.vAlign === "top") {
        // need to be set to null in order for style to become empty
        // aka bottom style be removed completely
        // @ts-ignore
        this.textTable.style.bottom = null;
      } else if (styles.vAlign === "bottom") {
        this.textTable.style.bottom = '0px';
      }

      const applyTextStyles = (
        imb: HTMLDivElement,
        fg: HTMLDivElement,
        bg: HTMLDivElement,
        styles,
        bgColor,
      ) => {
        if (styles.color != null) {
          fg.style.color = styles.color;
        }

        if (bgColor != null) {
          imb.style.webkitTextStrokeColor = bgColor;
        }
        if (styles.strokeWidth != null) {
          const strokeWidth = toNumberUnitString(styles.strokeWidth);
          imb.style.webkitTextStrokeWidth = strokeWidth;
          bg.style.webkitTextStrokeWidth = strokeWidth;
        }

        if (styles.strokeColor != null) {
          bg.style.webkitTextStrokeColor = styles.strokeColor;
        }

        if (styles.fontFamily != null) {
          imb.style.fontFamily = styles.fontFamily;
          fg.style.fontFamily = styles.fontFamily;
          bg.style.fontFamily = styles.fontFamily;
        }
        if (styles.fontSize != null) {
          const fontSize = toNumberUnitString(styles.fontSize);
          imb.style.fontSize = fontSize;
          fg.style.fontSize = fontSize;
          bg.style.fontSize = fontSize;
        }
        if (styles.fontWeight != null) {
          imb.style.fontWeight = styles.fontWeight;
          fg.style.fontWeight = styles.fontWeight;
          bg.style.fontWeight = styles.fontWeight;
        }
      };

      // RECOGNIZED TEXT
      if (this.settings.recognition.display) {
        applyTextStyles(
          // these are *guaranteed* to be divs here
          this.$refs["speech_text-imb"] as HTMLDivElement,
          this.$refs["speech_text-fg"] as HTMLDivElement,
          this.$refs["speech_text-bg"] as HTMLDivElement,
          styles.recognition,
          styles.bgColor
        );
      }

      // TRANSLATED TEXT
      if (this.settings.translation.enabled) {
        applyTextStyles(
          // these are *guaranteed* to be divs here
          this.$refs["trans_text-imb"] as HTMLDivElement,
          this.$refs["trans_text-fg"] as HTMLDivElement,
          this.$refs["trans_text-bg"] as HTMLDivElement,
          styles.translation,
          styles.bgColor
        );
      }
    },
    initVoiceRecognition(): void {
      if (!this.controls) {
        return;
      }
      if (!this.settings) {
        log.info("initVoiceRecognition(): settings empty");
        return;
      }
      // ignore because neither SpeechRecognition nor webkitSpeechRecognition
      // are known to typescript :(
      // @ts-ignore
      const r = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!r) {
        alert(
          "This widget does not work in this browser. Try a chrome based browser."
        );
        return;
      }
      if (this.srObj) {
        this.srObj.abort();
        this.srObj.stop();
      }

      this.srObj = new r();
      this.srObj.lang = this.settings.recognition.lang;
      this.srObj.interimResults = this.recognition.interimResults;
      this.srObj.continuous = this.recognition.continuous;

      this.srObj.onsoundstart = () => {
        this.status = "Sound started";
      };
      this.srObj.onnomatch = () => {
        this.status = "No match";
      };
      this.srObj.onerror = (evt: any) => {
        this.status = "Error";
        this.errors.unshift(evt.error);
        this.errors = this.errors.slice(0, 10);
        this.initVoiceRecognition();
      };
      this.srObj.onsoundend = () => {
        this.status = "Sound ended";
        this.initVoiceRecognition();
      };
      this.srObj.onspeechend = () => {
        this.status = "Speech ended";
        this.initVoiceRecognition();
      };
      this.srObj.onresult = async (evt: any) => {
        this.onVoiceResult(evt);
        this.initVoiceRecognition();
      };
      this.srObj.start();
    },
    onVoiceResult(evt: any): void {
      if (!this.ws) {
        log.error("onVoiceResult: this.ws not set");
        return;
      }
      let results = evt.results;
      log.info("onVoiceResult()", evt);
      for (var i = evt.resultIndex; i < results.length; i++) {
        if (!results[i].isFinal) {
          // recognizedText = "<<" + _recognizedText + ">>";
          // translatedText = "<<...>>";
          continue;
        }

        const _recognizedText = results[i][0].transcript;
        if (this.lastRecognizedText === _recognizedText) {
          continue;
        }

        this.ws.send(
          JSON.stringify({
            event: "onVoiceResult",
            text: _recognizedText,
          })
        );
        break;
      }
    },
  },
  mounted() {
    this.ws = util.wsClient(this.widget);
    this.ws.onMessage("text", (data: { recognized: string, translated: string }) => {
      this.texts.push({
        recognized: data.recognized,
        translated: data.translated,
        ready: true,
      });
      this._next();
    });
    this.ws.onMessage("init", (data: SpeechToTextWsInitData) => {
      this.settings = data.settings;
      this.$nextTick(() => {
        this.applyStyles();
        this.initVoiceRecognition();
      });
    });
    this.ws.connect();
  },
});
</script>
