<template>
  <div :style="widgetStyles" v-if="running">
    <div v-if="!finishined">{{ timeLeftHumanReadable }}</div>
    <div v-else>
      <span v-if="showTimerWhenFinished">{{ timeLeftHumanReadable }}</span>
      <span v-if="finishedText">{{ finishedText }}</span>
    </div>
  </div>
  <media-queue-element ref="q" :timeBetweenMediaMs="100" />
</template>
<script lang="ts">
import { defineComponent } from "vue";
import util from "../util";
import fn from "../../common/fn";
import { PomoEffect } from "../../mod/modules/PomoModuleCommon";
import WsClient from "../../frontend/WsClient";
import MediaQueueElement from "../MediaQueueElement.vue";

export default defineComponent({
  components: {
    MediaQueueElement,
  },
  data() {
    return {
      ws: null as WsClient | null,
      data: null,
      timeout: null,
      now: null,
    };
  },
  computed: {
    showTimerWhenFinished() {
      if (!this.data) {
        return false;
      }
      return !!this.data.settings.showTimerWhenFinished;
    },
    finishedText() {
      if (!this.data) {
        return false;
      }
      return this.data.settings.finishedText;
    },
    finishined() {
      return this.timeLeft <= 0;
    },
    running() {
      if (!this.data) {
        return false;
      }
      return !!this.data.state.running;
    },
    timeLeftHumanReadable() {
      const left = Math.max(this.timeLeft, 0);
      const MS = 1;
      const SEC = 1000 * MS;
      const MIN = 60 * SEC;
      const HOUR = 60 * MIN;
      const hours = fn.pad(Math.floor(left / HOUR), "00");
      const min = fn.pad(Math.floor((left % HOUR) / MIN), "00");
      const sec = fn.pad(Math.floor(((left % HOUR) % MIN) / SEC), "00");
      let str = this.data.settings.timerFormat;
      str = str.replace("{hh}", hours);
      str = str.replace("{mm}", min);
      str = str.replace("{ss}", sec);
      return str;
    },
    timeLeft() {
      if (!this.dateEnd || !this.now) {
        return 0;
      }
      return this.dateEnd.getTime() - this.now.getTime();
    },
    dateEnd() {
      if (!this.dateStarted || !this.data) {
        return null;
      }
      return new Date(this.dateStarted.getTime() + this.data.state.durationMs);
    },
    dateStarted() {
      if (!this.data) {
        return null;
      }
      return new Date(JSON.parse(this.data.state.startTs));
    },
    widgetStyles() {
      if (!this.data) {
        return {};
      }
      return {
        fontFamily: this.data.settings.fontFamily,
        fontSize: this.data.settings.fontSize,
        color: this.data.settings.color,
      };
    },
  },
  methods: {
    tick() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout = setTimeout(() => {
        this.now = new Date();
        if (this.data.state.running) {
          this.tick();
        }
      }, 1000);
    },
  },
  mounted() {
    this.ws = util.wsClient("pomo");
    this.ws.onMessage("init", (data) => {
      this.data = data;
      this.tick();
    });
    this.ws.onMessage("effect", (data: PomoEffect) => {
      this.$refs["q"].playmedia({
        sound: data.sound,
        image: {
          file: "",
          filename: "",
          urlpath: "",
        },
        twitch_clip: { url: "", volume: 100 },
        image_url: "",
        minDurationMs: 0,
      });
    });
    this.ws.connect();
  },
  unmounted() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  },
});
</script>
