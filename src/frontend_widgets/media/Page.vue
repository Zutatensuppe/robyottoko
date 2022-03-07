<template>
  <div v-if="!videosrc && imgstyle" :style="imgstyle"></div>
  <div v-if="videosrc" class="video-container">
    <div class="video-16-9">
      <video :src="videosrc" ref="video" autoplay />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import util from "../util";

import fn from "../../common/fn";
import { MediaCommandData } from "../../types";
import WsClient from "../../frontend/WsClient";
import {
  GeneralModuleSettings,
  default_settings,
} from "../../mod/modules/GeneralModuleCommon";
const TIME_BETWEEN_MEDIA = 100;

interface ComponentData {
  ws: WsClient | null;
  queue: MediaCommandData[];
  worker: any; // null | number (setInterval)
  imgstyle: null | Record<string, string>;
  settings: GeneralModuleSettings;
  videosrc: string;
}

export default defineComponent({
  data(): ComponentData {
    return {
      ws: null,
      queue: [],
      worker: null,
      imgstyle: null,
      settings: default_settings(),
      videosrc: "",
    };
  },
  methods: {
    async playone(media: MediaCommandData): Promise<void> {
      return new Promise(async (resolve) => {
        const promises: Promise<void>[] = [];
        if (media.twitch_clip.url) {
          this.videosrc = media.twitch_clip.url;
          promises.push(
            new Promise((res) => {
              this.$nextTick(() => {
                this.$refs.video.volume = !media.twitch_clip.volume
                  ? 0
                  : 100 / media.twitch_clip.volume;
                this.$refs.video.addEventListener("ended", () => {
                  res();
                });
              });
            })
          );
        }

        if (media.image_url) {
          this.imgstyle = {
            backgroundImage: `url(${media.image_url})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
            backgroundPosition: "center",
            height: "100%",
          };
        } else if (media.image && media.image.file) {
          await this.prepareImage(media.image.urlpath);
          this.imgstyle = {
            backgroundImage: `url(${media.image.urlpath})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
            backgroundPosition: "center",
            height: "100%",
          };
        }

        if (media.minDurationMs) {
          promises.push(
            new Promise((res) => {
              setTimeout(res, fn.parseHumanDuration(media.minDurationMs));
            })
          );
        }

        if (media.sound && media.sound.file) {
          promises.push(
            new Promise((res) => {
              const audio = new Audio(media.sound.urlpath);
              audio.addEventListener("ended", () => {
                res();
              });
              const maxVolume = this.settings.volume / 100.0;
              const soundVolume = media.sound.volume / 100.0;
              audio.volume = maxVolume * soundVolume;
              audio.play();
            })
          );
        }

        if (promises.length === 0) {
          // show images at least 1 sek by default (only if there
          // are no other conditions)
          promises.push(
            new Promise((resolve1) => {
              setTimeout(resolve1, 1000);
            })
          );
        }

        Promise.all(promises).then((_) => {
          this.imgstyle = null;
          this.videosrc = "";
          resolve();
        });
      });
    },
    addQueue(media: MediaCommandData) {
      this.queue.push(media);
      if (this.worker) {
        return;
      }

      const next = async () => {
        if (this.queue.length === 0) {
          clearInterval(this.worker);
          this.worker = null;
          return;
        }
        const media = this.queue.shift();
        if (!media) {
          clearInterval(this.worker);
          this.worker = null;
          return;
        }
        await this.playone(media);
        this.worker = setTimeout(next, TIME_BETWEEN_MEDIA); // this much time in between media
      };
      this.worker = setTimeout(next, TIME_BETWEEN_MEDIA);
    },
    async prepareImage(urlpath: string): Promise<void> {
      return new Promise((resolve) => {
        const imgLoad = new Image();
        imgLoad.src = urlpath;
        this.$nextTick(() => {
          if (imgLoad.loaded) {
            resolve();
          } else {
            imgLoad.onload = resolve;
          }
        });
      });
    },
    playmedia(media: MediaCommandData) {
      this.addQueue(media);
    },
  },
  mounted() {
    this.ws = util.wsClient("general");

    this.ws.onMessage("init", (data) => {
      this.settings = data.settings;
    });
    this.ws.onMessage("playmedia", (data) => {
      console.log(data);
      this.playmedia(data);
    });
    this.ws.connect();
  },
});
</script>
<style>
.video-container {
  position: absolute;
  width: 100%;
  height: 100%;
}
.video-container .video-16-9 {
  position: relative;
  padding-top: 56.25%;
  width: 100%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.video-container .video-16-9 video {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}
</style>
