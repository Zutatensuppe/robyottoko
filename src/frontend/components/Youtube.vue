<template>
  <div :id="id" />
</template>

<script lang="ts">
import { defineComponent } from "vue";

const log = (...args: any[]) => console.log("[youtube.js]", ...args);

interface YoutubePlayer {
  cueVideoById: (youtubeId: string) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  pauseVideo: () => void
  playVideo: () => void
  stopVideo: () => void
  setVolume: (volume: number) => void
  addEventListener: (event: string, callback: (event: any) => void) => void
}

let apiRdy = false;
function createApi(): Promise<void> {
  if (apiRdy) {
    log("ytapi ALREADY ready");
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.append(tag);
    // a callback function on window is required by youtube
    // https://developers.google.com/youtube/iframe_api_reference
    // @ts-ignore
    window.onYouTubeIframeAPIReady = () => {
      apiRdy = true;
      log("ytapi ready");
      resolve();
    };
  });
}

function createPlayer(id: string): Promise<YoutubePlayer> {
  return new Promise((resolve) => {
    log("create player on " + id);
    // no knowledge about YT.Player :(
    // @ts-ignore
    const player: YoutubePlayer = new YT.Player(id, {
      playerVars: {
        iv_load_policy: 3, // do not load annotations
        modestbranding: 1, // remove youtube logo
      },
      events: {
        onReady: () => {
          log("player ready");
          resolve(player);
        },
      },
    });
  });
}

async function prepareYt(id: string): Promise<YoutubePlayer> {
  await createApi();
  return await createPlayer(id);
}

interface ComponentData {
  id: string
  yt: YoutubePlayer | null
  loop: boolean
  toplay: string | null
  tovolume: number | null
  tryPlayInterval: any | null // number / timeout
}

const Youtube = defineComponent({
  props: {
    visible: {
      type: Boolean,
      default: true,
    },
  },
  data: (): ComponentData => ({
    id: "",
    yt: null,
    loop: false,
    toplay: null,
    tovolume: null,
    tryPlayInterval: null,
  }),
  created() {
    this.id = `yt-${Math.floor(
      Math.random() * 99 + 1
    )}-${new Date().getTime()}`;
  },
  async mounted() {
    this.yt = await prepareYt(this.id);

    if (this.tovolume !== null) {
      this.yt.setVolume(this.tovolume);
    }
    if (this.toplay !== null) {
      log("trying to play..");
      this.play(this.toplay);
    }
    this.yt.addEventListener("onStateChange", (event) => {
      // no knowledge about YT.PlayerState :(
      // @ts-ignore
      if (event.data === YT.PlayerState.CUED) {
        this.tryPlay();
        // no knowledge about YT.PlayerState :(
        // @ts-ignore
      } else if (event.data === YT.PlayerState.ENDED) {
        if (this.loop) {
          this.tryPlay();
        } else {
          this.$emit("ended");
        }
      }
    });
  },
  methods: {
    getDuration(): number {
      if (this.yt) {
        return this.yt.getDuration();
      }
      return 0;
    },
    getCurrentTime(): number {
      if (this.yt) {
        return this.yt.getCurrentTime();
      }
      return 0;
    },
    getProgress(): number {
      const d = this.getDuration();
      const c = this.getCurrentTime();
      return d ? c / d : 0;
    },
    stop(): void {
      if (this.yt) {
        this.yt.stopVideo();
      }
    },
    stopTryPlayInterval(): void {
      if (this.tryPlayInterval) {
        clearInterval(this.tryPlayInterval);
        this.tryPlayInterval = null;
      }
    },
    tryPlay(): void {
      this.stopTryPlayInterval();
      if (!this.visible) {
        return;
      }
      if (this.yt) {
        this.yt.playVideo();
      }

      let triesRemaining = 20;
      this.tryPlayInterval = setInterval(() => {
        log("playing", this.playing(), "triesRemaining", triesRemaining);
        --triesRemaining;
        if (this.playing() || triesRemaining < 0) {
          log("stopping interval");
          this.stopTryPlayInterval();
          return;
        }
        if (this.yt) {
          this.yt.playVideo();
        }
      }, 250);
    },
    play(yt: string): void {
      if (!this.yt) {
        this.toplay = yt;
      } else {
        this.yt.cueVideoById(yt);
        this.tryPlay();
      }
    },
    pause(): void {
      if (this.yt) {
        this.yt.pauseVideo();
      }
    },
    unpause(): void {
      if (this.yt) {
        this.tryPlay();
      }
    },
    setVolume(volume: number): void {
      if (!this.yt) {
        this.tovolume = volume;
      } else {
        this.yt.setVolume(volume);
      }
    },
    setLoop(loop: boolean): void {
      this.loop = loop;
    },
    playing(): boolean {
      if (!this.yt) {
        return false;
      }
      return this.yt.getPlayerState() === 1;
    },
  },
});
export type YoutubeInstance = InstanceType<typeof Youtube>
export default Youtube
</script>
