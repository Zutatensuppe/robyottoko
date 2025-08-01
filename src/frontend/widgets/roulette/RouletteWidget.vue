<template>
  <div class="roulette-layer">
    <RouletteWheel
      v-if="rouletteData"
      :data="rouletteData"
      @started="onWheelStarted"
      @ended="onWheelEnded"
      @close="onWheelClose"
      :autostart="true"
    />
    </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import RouletteWheel from '../../components/Roulette/RouletteWheel.vue'
import util, { WidgetApiData } from '../util'
import WsClient from '../../WsClient'
import { GeneralModuleSettings, GeneralModuleWsEventData, default_settings } from '../../../mod/modules/GeneralModuleCommon'
import { RouletteCommandData, WidgetId } from '../../../types'

const props = defineProps<{
  wdata: WidgetApiData,
}>()

let ws: WsClient | null = null
const settings = ref<GeneralModuleSettings>(default_settings())
const widgetId = ref<WidgetId>(util.getParam('id') as WidgetId)
const rouletteData = ref<RouletteCommandData | null>(null)
const rouletteQueue = ref<RouletteCommandData[]>([])

const onWheelStarted = () => {
  ws?.send(JSON.stringify({ event: 'roulette_start', data: {
    rouletteData: rouletteData.value,
  }}))
}

const onWheelEnded = (winner: string) => {
  ws?.send(JSON.stringify({ event: 'roulette_end', data: {
    rouletteData: rouletteData.value,
    winner,
  }}))
}

const onWheelClose = () => {
  rouletteData.value = null
  nextTick(() => {
    // maybe spin next queued one
    // nextTick is needed to remove the wheel and mount it again
    maybeSpin()
  })
}

const maybeSpin = () => {
  if (rouletteData.value) {
    return
  }

  const data = rouletteQueue.value.shift()
  if (data) {
    rouletteData.value = data
  }
}

onMounted(() => {
  ws = util.wsClient(props.wdata)
  ws.onMessage('init', (data: GeneralModuleWsEventData) => {
    settings.value = data.settings
  })
  ws.onMessage('roulette', (data: RouletteCommandData) => {
    if (!widgetId.value && data.widgetIds.length > 0 && !data.widgetIds.includes('' as WidgetId)) {
      // skipping this because it should not be displayed in global widget
    } else if (widgetId.value && !data.widgetIds.includes(widgetId.value)) {
      // skipping this, as it isn't coming from right command
    } else {
      rouletteQueue.value.push(data)
      maybeSpin()
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
<style lang="scss">
.roulette-layer {
  overflow: hidden;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;

  .wheel {
    position: relative;
    width: 800px;
    height: 800px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
}
</style>
