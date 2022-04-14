<template>
  <div :style="imgstyle" class="image-container" :class="{
    'm-fadeIn': showimage,
    'm-fadeOut': !showimage,
  }"></div>
  <div v-if="videosrc" class="video-container">
    <div class="video-16-9">
      <video :src="videosrc" ref="video" autoplay />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

import fn from "../common/fn";
import { MediaCommandData } from "../types";

interface ComponentData {
  queue: MediaCommandData[];
  worker: any; // null | number (setInterval)
  showimage: boolean;
  imgstyle: null | Record<string, string>;
  videosrc: string;
  latestResolved: boolean;
}

const MediaQueueElement = defineComponent({
  props: {
    timeBetweenMediaMs: { type: Number, default: 400 },
    baseVolume: { type: Number, default: 100 },
    displayLatestForever: { type: Boolean, default: false },
  },
  data(): ComponentData {
    return {
      queue: [],
      worker: null,
      showimage: false,
      imgstyle: null,
      videosrc: "",
      latestResolved: true,
    };
  },
  methods: {
    async _playone(media: MediaCommandData): Promise<void> {
      return new Promise(async (resolve) => {
        this.latestResolved = false;
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
          this.showimage = true;
          this.imgstyle = {
            backgroundImage: `url(${media.image_url})`,
          };
        } else if (media.image && media.image.file) {
          await this._prepareImage(media.image.urlpath);
          this.showimage = true;
          this.imgstyle = {
            backgroundImage: `url(${media.image.urlpath})`,
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
              const maxVolume = this.baseVolume / 100.0;
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
          if (!this.displayLatestForever) {
            this.showimage = false;
          }
          this.latestResolved = true;
          this.videosrc = "";
          resolve();
        });
      });
    },
    _addQueue(media: MediaCommandData) {
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
        await this._playone(media);
        this.worker = setTimeout(next, this.timeBetweenMediaMs); // this much time in between media
      };
      this.worker = setTimeout(next, this.timeBetweenMediaMs);
    },
    async _prepareImage(urlpath: string): Promise<void> {
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
      if (!this.displayLatestForever && this.latestResolved) {
        this.showimage = false;
      }
      this._addQueue(media);
    },
  },
});
export type MediaQueueElementInstance = InstanceType<typeof MediaQueueElement>
export default MediaQueueElement
</script>
<style scoped lang="scss">
.m-fadeOut {
  visibility: hidden;
  opacity: 0;
  transition: all 300ms;
}

.m-fadeIn {
  visibility: visible;
  opacity: 1;
  transition: all 300ms;
}

.image-container {
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
  height: 100%;
}

.video-container {
  position: absolute;
  width: 100%;
  height: 100%;

  .video-16-9 {
    position: relative;
    padding-top: 56.25%;
    width: 100%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    video {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
    }
  }
}
</style>
