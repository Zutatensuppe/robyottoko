<template>
  <span class="player" v-if="src" @click="toggle">{{ name }} <i class="fa ml-1" :class="cls"></i></span>
</template>
<script lang="ts">
import { defineComponent } from "vue";

interface ComponentData {
  audio: HTMLAudioElement | null
  playing: boolean
}
export default defineComponent({
  name: "player",
  props: {
    src: String,
    name: String,
    volume: {
      required: true,
    },
    baseVolume: {
      default: 100,
    },
  },
  data: (): ComponentData => ({
    audio: null,
    playing: false,
  }),
  created: function () {
    this.load();
    this.$watch("src", () => {
      this.load();
    });
  },
  computed: {
    cls(): string {
      return this.playing ? "fa-stop" : "fa-play";
    },
  },
  methods: {
    toggle(): void {
      if (!this.audio) {
        return
      }
      if (this.playing) {
        this.audio.pause();
        this.audio.currentTime = 0;
      } else {
        const maxVolume = parseInt(`${this.baseVolume}`, 10) / 100.0;
        const soundVolume = parseInt(`${this.volume}`, 10) / 100.0;
        this.audio.volume = maxVolume * soundVolume;
        this.audio.play();
      }
      this.playing = !this.playing;
    },
    load(): void {
      if (this.audio) {
        this.audio.pause();
        this.audio = null;
      }
      this.audio = new Audio(this.src);
      this.audio.addEventListener("ended", () => {
        this.playing = false;
      });
      this.playing = false;
    },
  },
});
</script>
