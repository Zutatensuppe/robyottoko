<template>
  <media-queue-element
    ref="q"
    :time-between-media-ms="500"
    :display-latest-forever="displayLatestForever"
  />
</template>
<script setup lang="ts">
import { newMedia } from '../../../common/commands'
import { onMounted, onUnmounted, Ref, ref } from 'vue'
import { SoundMediaFile } from '../../../types'
import MediaQueueElement from '../MediaQueueElement.vue'
import util, { WidgetApiData } from '../util'
import WsClient from '../../WsClient'

const props = defineProps<{
  wdata: WidgetApiData,
}>()

let ws: WsClient | null = null
const displayDuration = ref<number>(5000)
const displayLatestForever = ref<boolean>(false)
const notificationSound = ref<SoundMediaFile | null>(null)
const q = ref<InstanceType<typeof MediaQueueElement>>() as Ref<InstanceType<typeof MediaQueueElement>>

  // @ts-ignore
import('./main.scss')

// images that were approved since opening this widget
let imagesStack: string[] = []

onMounted(() => {
  ws = util.wsClient(props.wdata)

  ws.onMessage('init', (data) => {
    // submit button may not be empty
    displayLatestForever.value = data.settings.displayLatestForever
    notificationSound.value = data.settings.notificationSound

    if (data.settings.displayLatestAutomatically && data.images.length > 0) {
      imagesStack.push(data.images[0].path)
      q.value.playmedia(newMedia({
        image_url: data.images[0].path,
        minDurationMs: displayDuration.value,
      }))
    }
  })
  ws.onMessage(
    'approved_image_received',
    (data: { nonce: string; img: string; mayNotify: boolean }) => {
      imagesStack.push(data.img)
      q.value.playmedia(newMedia({
        sound: data.mayNotify ? notificationSound.value : null,
        image_url: data.img,
        minDurationMs: displayDuration.value,
      }))
    },
  )
  ws.onMessage(
    'image_deleted',
    (data: { nonce: string; img: string; previousImg: string, mayNotify: boolean }) => {
      imagesStack = imagesStack.filter(item => item !== data.img)
      q.value.removeMedia(newMedia({ image_url: data.img }))
      if (!q.value.hasQueuedMedia() && displayLatestForever.value && imagesStack.length > 0) {
        q.value.playmedia(newMedia({
          sound: null,
          image_url: imagesStack[imagesStack.length - 1],
          minDurationMs: displayDuration.value,
        }))
      }
    },
  )
  ws.connect()
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
