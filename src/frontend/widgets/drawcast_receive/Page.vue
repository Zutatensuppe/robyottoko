<template>
  <media-queue-element ref="q" :timeBetweenMediaMs="500" :displayLatestForever="displayLatestForever" />
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import WsClient from "../../WsClient";
import { DrawcastImage } from "../../../mod/modules/DrawcastModuleCommon";
import { SoundMediaFile } from "../../../types";
import util, { WidgetApiData } from "../util";
import MediaQueueElement, { MediaQueueElementInstance } from "../MediaQueueElement.vue";
import { newMedia } from "../../../common/commands";

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
  props: {
    wdata: { type: Object as PropType<WidgetApiData>, required: true }
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
  computed: {
    q(): MediaQueueElementInstance {
      return this.$refs.q as MediaQueueElementInstance
    },
  },
  created() {
    // @ts-ignore
    import("./main.scss");
  },
  mounted() {
    this.ws = util.wsClient(this.wdata);

    this.ws.onMessage("init", (data) => {
      // submit button may not be empty
      this.displayLatestForever = data.settings.displayLatestForever;
      this.notificationSound = data.settings.notificationSound;
      this.images = data.images.map((image: DrawcastImage) => image.path);

      if (data.settings.displayLatestAutomatically && this.images.length > 0) {
        this.q.playmedia(newMedia({
          image_url: this.images[0],
          minDurationMs: this.displayDuration,
        }));
      }
    });
    this.ws.onMessage(
      "approved_image_received",
      (data: { nonce: string; img: string; mayNotify: boolean }) => {
        this.images.unshift(data.img);
        this.images = this.images.slice(0, 20);
        this.q.playmedia(newMedia({
          sound: data.mayNotify ? this.notificationSound : null,
          image_url: data.img,
          minDurationMs: this.displayDuration,
        }));
      }
    );
    this.ws.connect();
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect()
    }
  },
});
</script>
