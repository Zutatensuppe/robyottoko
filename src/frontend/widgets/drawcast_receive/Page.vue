<template>
  <media-queue-element
    ref="q"
    :time-between-media-ms="500"
    :display-latest-forever="displayLatestForever"
  />
</template>
<script setup lang="ts">
import { DrawcastImage } from "../../../mod/modules/DrawcastModuleCommon";
import { newMedia } from "../../../common/commands";
import { onMounted, onUnmounted, Ref, ref } from "vue";
import { SoundMediaFile } from "../../../types";
import MediaQueueElement from "../MediaQueueElement.vue";
import util, { WidgetApiData } from "../util";
import WsClient from "../../WsClient";

const props = defineProps<{
  wdata: WidgetApiData,
}>()

let ws: WsClient | null = null
const displayDuration = ref<number>(5000)
const displayLatestForever = ref<boolean>(false)
const notificationSound = ref<SoundMediaFile | null>(null)
const images = ref<any[]>([])
const q = ref<InstanceType<typeof MediaQueueElement>>() as Ref<InstanceType<typeof MediaQueueElement>>

  // @ts-ignore
import("./main.scss");

onMounted(() => {
  ws = util.wsClient(props.wdata);

  ws.onMessage("init", (data) => {
    // submit button may not be empty
    displayLatestForever.value = data.settings.displayLatestForever;
    notificationSound.value = data.settings.notificationSound;
    images.value = data.images.map((image: DrawcastImage) => image.path);

    if (data.settings.displayLatestAutomatically && images.value.length > 0) {
      q.value.playmedia(newMedia({
        image_url: images.value[0],
        minDurationMs: displayDuration.value,
      }));
    }
  });
  ws.onMessage(
    "approved_image_received",
    (data: { nonce: string; img: string; mayNotify: boolean }) => {
      images.value.unshift(data.img);
      images.value = images.value.slice(0, 20);
      q.value.playmedia(newMedia({
        sound: data.mayNotify ? notificationSound.value : null,
        image_url: data.img,
        minDurationMs: displayDuration.value,
      }));
    }
  );
  ws.connect();
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
