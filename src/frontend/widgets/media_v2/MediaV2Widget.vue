<template>
  <MediaV2QueueElement
    ref="q"
    :base-volume="settings.volume"
  />
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, Ref, ref } from 'vue'
import util, { WidgetApiData } from '../util'
import WsClient from '../../WsClient'
import {
  default_settings,
  GeneralModuleSettings,
  GeneralModuleWsEventData,
} from '../../../mod/modules/GeneralModuleCommon'
import MediaV2QueueElement from '../MediaV2QueueElement.vue'
import type { MediaV2CommandData } from '../../../types'
import { newMediaV2 } from '../../../common/commands'

const props = defineProps<{
  wdata: WidgetApiData,
}>()

let ws: WsClient | null = null
const settings = ref<GeneralModuleSettings>(default_settings())
const widgetId = ref<string>(util.getParam('id'))
const q = ref<InstanceType<typeof MediaV2QueueElement>>() as Ref<InstanceType<typeof MediaV2QueueElement>>

// @ts-ignore
import('./main.scss')

onMounted(() => {
  ws = util.wsClient(props.wdata)
  ws.onMessage('init', (data: GeneralModuleWsEventData) => {
    settings.value = data.settings
  })
  ws.onMessage('playmediaV2', (data: MediaV2CommandData) => {
    if (!widgetId.value && data.widgetIds.length > 0 && !data.widgetIds.includes('')) {
      // skipping this because it should not be displayed in global widget
    } else if (widgetId.value && !data.widgetIds.includes(widgetId.value)) {
      // skipping this, as it isn't coming from right command
    } else {
      q.value.playmedia(newMediaV2(data))
    }
  })
  ws.connect()
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
