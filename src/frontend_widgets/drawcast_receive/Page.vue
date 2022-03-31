<template>
  <media-queue-element
    ref="q"
    :timeBetweenMediaMs="500"
    :displayLatestForever="displayLatestForever"
  />
</template>
<script lang="ts">
import { defineComponent } from "vue";
import WsClient from "../../frontend/WsClient";
import { DrawcastImage } from "../../mod/modules/DrawcastModuleCommon";
import { SoundMediaFile } from "../../types";
import util from "../util";
import MediaQueueElement from "../MediaQueueElement.vue";

interface ComponentData {
  ws: WsClient | null;
  displayDuration: number;
  displayLatestForever: boolean;
  notificationSound: SoundMediaFile | null;
  images: any[];
}

export default defineComponent({
  components: {
    MediaQueueElement,
  },
  data(): ComponentData {
    return {
      ws: null,
      displayDuration: 5000,
      displayLatestForever: false,
      notificationSound: null,
      images: [],
    };
  },
  mounted() {
    this.ws = util.wsClient("drawcast_receive");

    this.ws.onMessage("init", (data) => {
      // submit button may not be empty
      this.displayLatestForever = data.settings.displayLatestForever;
      this.notificationSound = data.settings.notificationSound;
      this.images = data.images.map((image: DrawcastImage) => image.path);

      if (data.settings.displayLatestAutomatically && this.images.length > 0) {
        this.$refs["q"].playmedia({
          sound: { file: "", filename: "", urlpath: "", volume: 100 },
          image: { file: "", filename: "", urlpath: "" },
          twitch_clip: { url: "", volume: 100 },
          image_url: this.images[0],
          minDurationMs: this.displayDuration,
        });
      }
    });
    this.ws.onMessage(
      "approved_image_received",
      (data: { nonce: string; img: string; mayNotify: boolean }) => {
        this.images.unshift(data.img);
        this.images = this.images.slice(0, 20);

        this.$refs["q"].playmedia({
          sound:
            data.mayNotify && this.notificationSound
              ? this.notificationSound
              : { file: "", filename: "", urlpath: "", volume: 100 },
          image: { file: "", filename: "", urlpath: "" },
          twitch_clip: { url: "", volume: 100 },
          image_url: data.img,
          minDurationMs: this.displayDuration,
        });
      }
    );
    this.ws.connect();
  },
});
</script>
