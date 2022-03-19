<template>
  <div v-if="imgstyle" :style="imgstyle"></div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import WsClient from "../../frontend/WsClient";
import { DrawcastImage } from "../../mod/modules/DrawcastModuleCommon";
import { SoundMediaFile } from "../../types";
import util from "../util";

interface Media {
  image: {
    url: string;
  };
}

interface QueueItem {
  media: Media;
  playsound: boolean;
}

interface ComponentData {
  ws: WsClient | null;
  queue: QueueItem[];
  worker: any; // null | number (setInterval)
  imgstyle: null | Record<string, string>;
  displayDuration: number;
  displayLatestForever: boolean;
  displayLatestAutomatically: boolean;
  notificationSound: SoundMediaFile | null;
  notificationSoundAudio: any;
  latestResolved: boolean;
  images: any[];
}

export default defineComponent({
  data(): ComponentData {
    return {
      ws: null,
      queue: [],
      worker: null,
      imgstyle: null,
      displayDuration: 5000,
      displayLatestForever: false,
      displayLatestAutomatically: false,

      notificationSound: null,
      notificationSoundAudio: null,
      latestResolved: true,

      images: [],
    };
  },
  methods: {
    async playone(item: QueueItem): Promise<void> {
      return new Promise(async (resolve) => {
        this.latestResolved = false;
        await this.prepareImage(item.media.image.url);

        this.imgstyle = {
          backgroundImage: `url(${item.media.image.url})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          backgroundPosition: "center",
          height: "100%",
        };

        if (item.playsound && this.notificationSoundAudio) {
          this.notificationSoundAudio.play();
        }

        setTimeout(() => {
          if (!this.displayLatestForever) {
            this.imgstyle = null;
          }
          this.latestResolved = true;
          resolve();
        }, this.displayDuration);
      });
    },
    addQueue(media: Media, playsound: boolean) {
      this.queue.push({ media, playsound });
      if (this.worker) {
        return;
      }

      const next = async () => {
        if (this.queue.length === 0) {
          clearInterval(this.worker);
          this.worker = null;
          return;
        }
        const item = this.queue.shift();
        if (!item) {
          clearInterval(this.worker);
          this.worker = null;
          return;
        }
        await this.playone(item);
        this.worker = setTimeout(next, 500); // this much time in between media
      };
      this.worker = setTimeout(next, 500);
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
    playmedia(media: Media, playsound: boolean) {
      this.addQueue(media, playsound);
    },
  },
  mounted() {
    this.ws = util.wsClient("drawcast");

    this.ws.onMessage("init", (data) => {
      // submit button may not be empty
      this.displayDuration = data.settings.displayDuration;
      this.displayLatestForever = data.settings.displayLatestForever;
      this.notificationSound = data.settings.notificationSound;
      this.displayLatestAutomatically =
        data.settings.displayLatestAutomatically;

      // if previously set to 'display forever' and something is
      // currently displaying because of that, hide it
      if (!this.displayLatestForever && this.latestResolved) {
        this.imgstyle = null;
      }
      if (this.notificationSound) {
        this.notificationSoundAudio = new Audio(this.notificationSound.urlpath);
        this.notificationSoundAudio.volume =
          this.notificationSound.volume / 100.0;
      }
      this.images = data.images.map((image: DrawcastImage) => image.path);

      if (this.displayLatestAutomatically && this.images.length > 0) {
        this.playmedia(
          {
            image: { url: this.images[0] },
          },
          false
        );
      }
    });
    this.ws.onMessage(
      "approved_image_received",
      (data: { nonce: string; img: string; mayNotify: boolean }) => {
        this.images.unshift(data.img);
        this.images = this.images.slice(0, 20);
        this.playmedia(
          {
            image: { url: data.img },
          },
          data.mayNotify
        );
      }
    );
    this.ws.connect();
  },
});
</script>
