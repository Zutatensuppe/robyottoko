<template>
  <div :id="id"></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

const log = (...args) => console.log("[youtube.js]", ...args);

let apiRdy = false;
function createApi() {
  if (apiRdy) {
    log("ytapi ALREADY ready");
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.append(tag);
    window.onYouTubeIframeAPIReady = () => {
      apiRdy = true;
      log("ytapi ready");
      resolve();
    };
  });
}

function createPlayer(id) {
  return new Promise((resolve) => {
    log("create player on " + id);
    const player = new YT.Player(id, {
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

async function prepareYt(id) {
  await createApi();
  return await createPlayer(id);
}

export default defineComponent({
  name: "youtube",
  props: {
    visible: {
      type: Boolean,
      default: true,
    },
  },
  data: () => ({
    id: "",
    yt: null,
    toplay: null,
    tovolume: null,
    tryPlayInterval: null,
  }),
  created() {
    this.id = `yt-${Math.floor(
      Math.random() * 99 + 1
    )}-${new Date().getTime()}`;
  },
  methods: {
    getDuration() {
      if (this.yt) {
        return this.yt.getDuration()
      }
      return 0
    },
    getCurrentTime() {
      if (this.yt) {
        return this.yt.getCurrentTime()
      }
      return 0
    },
    getProgress() {
      const d = this.getDuration()
      const c = this.getCurrentTime()
      return d ? c / d : 0
    },
    stop() {
      if (this.yt) {
        this.yt.stopVideo();
      }
    },
    stopTryPlayInterval() {
      if (this.tryPlayInterval) {
        clearInterval(this.tryPlayInterval);
        this.tryPlayInterval = null;
      }
    },
    tryPlay() {
      this.stopTryPlayInterval();
      if (!this.visible) {
        return;
      }

      this.yt.playVideo();

      let triesRemaining = 20;
      this.tryPlayInterval = setInterval(() => {
        log("playing", this.playing(), "triesRemaining", triesRemaining);
        --triesRemaining;
        if (this.playing() || triesRemaining < 0) {
          log("stopping interval");
          this.stopTryPlayInterval();
          return;
        }
        this.yt.playVideo();
      }, 250);
    },
    play(yt) {
      if (!this.yt) {
        this.toplay = yt;
      } else {
        this.yt.cueVideoById(yt);
        this.tryPlay();
      }
    },
    pause() {
      if (this.yt) {
        this.yt.pauseVideo();
      }
    },
    unpause() {
      if (this.yt) {
        this.tryPlay();
      }
    },
    setVolume(volume) {
      if (!this.yt) {
        this.tovolume = volume;
      } else {
        this.yt.setVolume(volume);
      }
    },
    setLoop(loop) {
      this.loop = loop;
    },
    playing() {
      return this.yt && this.yt.getPlayerState() === 1;
    },
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
      if (event.data === YT.PlayerState.CUED) {
        this.tryPlay();
      } else if (event.data === YT.PlayerState.ENDED) {
        if (this.loop) {
          this.tryPlay();
        } else {
          this.$emit("ended");
        }
      }
    });
  },
});
</script>
