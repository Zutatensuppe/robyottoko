<template>
  <div v-if="imgstyle" :style="imgstyle"></div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import util from "../util";

export default defineComponent({
  data() {
    return {
      ws: null,
      queue: [],
      worker: null,
      imgstyle: "",
      displayDuration: 5000,
      displayLatestForever: false,

      notificationSound: null,
      notificationSoundAudio: null,
      latestResolved: true,

      images: [],
    };
  },
  methods: {
    async playone({ media, playsound }) {
      return new Promise(async (resolve) => {
        this.latestResolved = false;
        await this.prepareImage(media.image.url);

        this.imgstyle = {
          backgroundImage: `url(${media.image.url})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          backgroundPosition: "center",
          height: "100%",
        };

        if (playsound && this.notificationSoundAudio) {
          this.notificationSoundAudio.play();
        }

        setTimeout(() => {
          if (!this.displayLatestForever) {
            this.imgstyle = "";
          }
          this.latestResolved = true;
          resolve();
        }, this.displayDuration);
      });
    },
    addQueue(media, playsound) {
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
        await this.playone(this.queue.shift());
        this.worker = setTimeout(next, 500); // this much time in between media
      };
      this.worker = setTimeout(next, 500);
    },
    async prepareImage(img) {
      return new Promise((resolve) => {
        const imgLoad = new Image();
        imgLoad.src = img;
        this.$nextTick(() => {
          if (imgLoad.loaded) {
            resolve();
          } else {
            imgLoad.onload = resolve;
          }
        });
      });
    },
    playmedia(media, playsound) {
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
        this.imgstyle = "";
      }
      if (this.notificationSound) {
        this.notificationSoundAudio = new Audio(this.notificationSound.urlpath);
        this.notificationSoundAudio.volume =
          this.notificationSound.volume / 100.0;
      }
      this.images = data.images;

      if (this.displayLatestAutomatically && this.images.length > 0) {
        this.playmedia(
          {
            image: { url: this.images[0] },
          },
          false
        );
      }
    });
    this.ws.onMessage("post", (data) => {
      this.images.unshift(data.img);
      this.images = this.images.slice(0, 20);
      this.playmedia(
        {
          image: { url: data.img },
        },
        true
      );
    });
    this.ws.connect();
  },
});
</script>
