<template>
  <div class="big" ref="result_text" v-if="settings">
    <div v-if="settings.status.enabled">{{ status }}</div>
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

export default defineComponent({
  data() {
    return {
      ws: null,
      status: "",
      textTimeoutMs: 10000,

      // prevent doing things twice
      lastUtterance: null,
      lastRecognizedText: null,

      recognition: {
        interimResults: false,
        continuous: true,
      },

      // texts
      recognizedText: "",
      translatedText: "",

      // timeout objects to hide text after time
      recognizedTextTimeout: null,
      translatedTextTimeout: null,

      // settings (overwritten from data ws)
      settings: null,
    };
  },
  watch: {
    recognizedText(newVal, oldVal) {
      if (newVal) {
        if (this.recognizedTextTimeout) {
          clearTimeout(this.recognizedTextTimeout);
        }
        this.recognizedTextTimeout = setTimeout(() => {
          this.recognizedText = "";
        }, this.textTimeoutMs);
      }
    },
    translatedText(newVal, oldVal) {
      if (newVal) {
        if (this.translatedTextTimeout) {
          clearTimeout(this.translatedTextTimeout);
        }
        this.translatedTextTimeout = setTimeout(() => {
          this.translatedText = "";
        }, this.textTimeoutMs);
      }
    },
  },
  methods: {
    synthesize(text, lang) {
      if (this.lastUtterance !== text) {
        this.lastUtterance = text;
        let utterance = new SpeechSynthesisUtterance(this.lastUtterance);
        if (lang) {
          utterance.lang = lang;
        }
        speechSynthesis.speak(utterance);
      }
    },
    applyStyles() {
      const styles = this.settings.styles;

      if (styles.bgColor != null) {
        document.bgColor = styles.bgColor;
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
          imb.style.webkitTextStrokeWidth = styles.strokeWidth + "pt";
          bg.style.webkitTextStrokeWidth = styles.strokeWidth + "pt";
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
          imb.style.fontSize = styles.fontSize + "pt";
          fg.style.fontSize = styles.fontSize + "pt";
          bg.style.fontSize = styles.fontSize + "pt";
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
      const r = window.SpeechRecognition || window.webkitSpeechRecognition;

      var srObj = new r();
      srObj.lang = this.settings.recognition.lang;
      srObj.interimResults = this.recognition.interimResults;
      srObj.continuous = this.recognition.continuous;

      srObj.onsoundstart = () => {
        this.status = "Sound started";
      };
      srObj.onnomatch = () => {
        this.status = "No match";
      };
      srObj.onerror = () => {
        this.status = "Error";
        srObj.stop();
        this.initVoiceRecognition();
      };
      srObj.onsoundend = () => {
        this.status = "Sound ended";
        srObj.stop();
        this.initVoiceRecognition();
      };
      srObj.onspeechend = () => {
        this.status = "Speech ended";
        srObj.stop();
        this.initVoiceRecognition();
      };

      srObj.onresult = async (evt) => {
        this.onVoiceResult(evt);
        srObj.stop();
        this.initVoiceRecognition();
      };
      srObj.start();
    },
    onVoiceResult(event) {
      var results = event.results;
      for (var i = event.resultIndex; i < results.length; i++) {
        const recognizedText = results[i][0].transcript;
        if (!results[i].isFinal) {
          this.recognizedText = "<<" + recognizedText + ">>";
          this.translatedText = "<<...>>";
          continue;
        }

        if (this.lastRecognizedText === recognizedText) {
          continue;
        }
        this.lastRecognizedText = recognizedText;

        if (this.settings.recognition.synthesize) {
          this.synthesize(
            recognizedText,
            this.settings.recognition.synthesizeLang
          );
        }

        this.recognizedText = this.lastRecognizedText;
        if (!this.settings.translation.enabled) {
          this.translatedText = "...";
          continue;
        }

        this.translatedText = "???";
        this.ws.send(
          JSON.stringify({
            event: "translate",
            text: recognizedText,
            src: this.settings.translation.langSrc,
            dst: this.settings.translation.langDst,
          })
        );
      }
    },
  },
  mounted() {
    this.ws = util.wsClient("speech-to-text");
    this.ws.onMessage("translated", (data) => {
      this.recognizedText = data.in;
      this.translatedText = data.out;
      if (this.settings.translation.synthesize) {
        this.synthesize(
          this.translatedText,
          this.settings.translation.synthesizeLang
        );
      }
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
