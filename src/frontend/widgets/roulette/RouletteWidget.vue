<template>
  <RouletteWheel
    v-if="wheelData"
    :data="wheelData"
    @ended="onWheelEnded"
  />
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import RouletteWheel from './components/RouletteWheel.vue'
import util, { WidgetApiData } from '../util'
import WsClient from '../../WsClient'
import { GeneralModuleSettings, GeneralModuleWsEventData, default_settings } from '../../../mod/modules/GeneralModuleCommon'
import { RouletteCommandData } from '../../../types'

const props = defineProps<{
  wdata: WidgetApiData,
}>()

let ws: WsClient | null = null
const settings = ref<GeneralModuleSettings>(default_settings())
const widgetId = ref<string>(util.getParam('id'))
const wheelData = ref<RouletteCommandData | null>(null)

const onWheelEnded = () => {
  wheelData.value = null
}

onMounted(() => {
  ws = util.wsClient(props.wdata)
  ws.onMessage('init', (data: GeneralModuleWsEventData) => {
    settings.value = data.settings
  })
  ws.onMessage('roulette', (data: RouletteCommandData) => {
    if (!widgetId.value && data.widgetIds.length > 0 && !data.widgetIds.includes('')) {
      // skipping this because it should not be displayed in global widget
    } else if (widgetId.value && !data.widgetIds.includes(widgetId.value)) {
      // skipping this, as it isn't coming from right command
    } else {
      wheelData.value = data
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
