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
          <div
            v-if="settings.recognition.display"
            class="stroke-single-bg"
            ref="speech_text-bg"
          >
            {{ recognizedText }}
          </div>
          <div
            v-if="settings.recognition.display"
            class="stroke-single-fg"
            ref="speech_text-fg"
          >
            {{ recognizedText }}
          </div>
          <div
            v-if="settings.recognition.display"
            class="stroke-single-imb"
            ref="speech_text-imb"
          >
            {{ recognizedText }}
          </div>

          <div
            v-if="settings.translation.enabled"
            class="stroke-single-bg"
            ref="trans_text-bg"
          >
            {{ translatedText }}
          </div>
          <div
            v-if="settings.translation.enabled"
            class="stroke-single-fg"
            ref="trans_text-fg"
          >
            {{ translatedText }}
          </div>
          <div
            v-if="settings.translation.enabled"
            class="stroke-single-imb"
            ref="trans_text-imb"
          >
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
import { calculateOptimalSubtitleDisplayTimeMs, logger } from "../../common/fn";
const log = logger("speech-to-text/Page.vue");

// in brave treat insecure as secure to allow mic locally:
//   brave://flags/#unsafely-treat-insecure-origin-as-secure

export default defineComponent({
  props: {
    controls: { type: Boolean, required: true },
  },
  data() {
    return {
      ws: null,
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

      // // timeout objects to hide text after time
      // recognizedTextTimeout: null,
      // translatedTextTimeout: null,

      // settings (overwritten from data ws)
      settings: null,

      srObj: null as any,
    };
  },
  computed: {
    recognizedText() {
      if (this.texts.length === 0 || !this.texts[0].ready) {
        return "";
      }
      return this.texts[0].recognized;
    },
    translatedText() {
      if (this.texts.length === 0 || !this.texts[0].ready) {
        return "";
      }
      return this.texts[0].translated;
    },
    lastRecognizedText() {
      if (this.texts.length === 0) {
        return "";
      }
      this.texts[this.texts.length - 1].recognized;
    },
    wantsSpeech() {
      return (
        this.settings.recognition.synthesize ||
        this.settings.translation.synthesize
      );
    },
  },
  methods: {
    initSpeech() {
      log.log(speechSynthesis);
      speechSynthesis.cancel();
      speechSynthesis.resume();
      this.initedSpeech = true;
    },
    _next() {
      if (this.timeout) {
        log.info("_next(): timeout still active");
        return;
      }
      if (!this.recognizedText && !this.translatedText) {
        log.info("_next(): recognizedText and translatedText empty");
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
    calculateSubtitleDisplayTime(text: string) {
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
    applyStyles() {
      const styles = this.settings.styles;

      if (styles.bgColorEnabled && styles.bgColor != null) {
        document.body.style.backgroundColor = styles.bgColor;
      } else {
        document.body.style.backgroundColor = "";
      }

      if (styles.vAlign === "top") {
        this.$refs["text_table"].style.bottom = null;
      } else if (styles.vAlign === "bottom") {
        this.$refs["text_table"].style.bottom = 0;
      }

      const applyTextStyles = (imb, fg, bg, styles, bgColor) => {
        if (styles.color != null) {
          fg.style.color = styles.color;
        }

        if (bgColor != null) {
          imb.style.webkitTextStrokeColor = bgColor;
        }
        if (styles.strokeWidth != null) {
          imb.style.webkitTextStrokeWidth = styles.strokeWidth;
          bg.style.webkitTextStrokeWidth = styles.strokeWidth;
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
          imb.style.fontSize = styles.fontSize;
          fg.style.fontSize = styles.fontSize;
          bg.style.fontSize = styles.fontSize;
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
          this.$refs["speech_text-imb"],
          this.$refs["speech_text-fg"],
          this.$refs["speech_text-bg"],
          styles.recognition,
          styles.bgColor
        );
      }

      // TRANSLATED TEXT
      if (this.settings.translation.enabled) {
        applyTextStyles(
          this.$refs["trans_text-imb"],
          this.$refs["trans_text-fg"],
          this.$refs["trans_text-bg"],
          styles.translation,
          styles.bgColor
        );
      }
    },
    initVoiceRecognition() {
      if (!this.controls) {
        return;
      }
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
    onVoiceResult(evt: any) {
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
    this.ws = util.wsClient("speech-to-text");
    this.ws.onMessage("text", (data) => {
      this.texts.push({
        recognized: data.recognized,
        translated: data.translated,
        ready: true,
      });
      this._next();
    });
    this.ws.onMessage("init", (data) => {
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
