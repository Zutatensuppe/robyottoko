<template>
  <div
    :style="imgstyle"
    class="image-container"
    :class="{
      'm-fadeIn': showimage,
      'm-fadeOut': !showimage,
    }"
  />
  <div
    v-if="videosrc"
    class="video-container"
  >
    <div class="video-16-9">
      <video
        ref="video"
        :src="videosrc"
        autoplay
      />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

import fn, { logger } from "../../common/fn";
import { MediaCommandData } from "../../types";

const log = logger('MediaQueueElement.vue')

interface ComponentData {
  queue: MediaCommandData[];
  worker: any; // null | number (setInterval)
  showimage: boolean;
  imgstyle: undefined | Record<string, string>;
  videosrc: string;
  latestResolved: boolean;
}

const playSound = (path: string, volume: number): Promise<void> => {
  return new Promise((res) => {
    const audio = new Audio(path);
    audio.addEventListener("ended", () => {
      res();
    });
    audio.volume = fn.clamp(0, volume, 1);
    audio.play();
  })
}

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve1) => {
    setTimeout(resolve1, ms);
  })
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
      imgstyle: undefined,
      videosrc: "",
      latestResolved: true,
    };
  },
  methods: {
    async _playone(media: MediaCommandData): Promise<void> {
      return new Promise(async (resolve) => {
        this.latestResolved = false;
        const promises: Promise<void>[] = [];
        if (media.video.url) {
          this.videosrc = media.video.url;
          promises.push(
            new Promise((res) => {
              this.$nextTick(() => {
                // it should be always a HTMLVideoElement
                // because we set the videosrc. there could be some
                // conditions where this is not true but for now this
                // will be fine
                const videoEl = this.$refs.video as HTMLVideoElement
                const volume = media.video.volume / 100
                videoEl.addEventListener("error", (e) => {
                  log.error({ e }, 'error when playing video')
                  res();
                });
                videoEl.volume = fn.clamp(0, volume, 1)
                videoEl.addEventListener("ended", () => {
                  res();
                });
              });
            })
          );
        }

        let imageUrl = ''
        if (media.image_url) {
          imageUrl = media.image_url
        } else if (media.image && media.image.file) {
          imageUrl = media.image.urlpath
        }
        if (imageUrl) {
          await this._prepareImage(imageUrl);
          this.showimage = true
          this.imgstyle = { backgroundImage: `url(${imageUrl})` }
        }

        if (media.minDurationMs) {
          promises.push(wait(fn.parseHumanDuration(media.minDurationMs)))
        }

        if (media.sound && media.sound.file) {
          const path = media.sound.urlpath
          const maxVolume = this.baseVolume / 100.0
          const soundVolume = media.sound.volume / 100.0
          const volume = maxVolume * soundVolume
          promises.push(playSound(path, volume))
        }

        if (promises.length === 0) {
          // show images at least 1 sek by default (only if there
          // are no other conditions)
          promises.push(wait(1000));
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
    _addQueue(media: MediaCommandData): void {
      this.queue.push(media);
      if (this.worker) {
        return;
      }

      const next = async (): Promise<void> => {
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
          if (imgLoad.complete) {
            resolve();
          } else {
            imgLoad.onload = () => {
              resolve();
            }
          }
        });
      });
    },
    playmedia(media: MediaCommandData): void {
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
  top: 0;
  left: 0;
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
