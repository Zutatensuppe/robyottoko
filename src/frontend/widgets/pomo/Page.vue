<template>
  <div
    v-if="running"
    :style="widgetStyles"
  >
    <div v-if="!finishined">
      {{ timeLeftHumanReadable }}
    </div>
    <div v-else>
      <span v-if="showTimerWhenFinished">{{ timeLeftHumanReadable }}</span>
      <span v-if="finishedText">{{ finishedText }}</span>
    </div>
  </div>
  <media-queue-element
    ref="q"
    :time-between-media-ms="100"
  />
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, Ref, ref } from "vue";
import util, { WidgetApiData } from "../util";
import fn from "../../../common/fn";
import { newMedia } from "../../../common/commands";
import { PomoEffect, PomoModuleWsDataData } from "../../../mod/modules/PomoModuleCommon";
import WsClient from "../../WsClient";
import MediaQueueElement from "../MediaQueueElement.vue";

const props = defineProps<{
  wdata: WidgetApiData,
}>()

let ws: WsClient | null = null

const data = ref<PomoModuleWsDataData | null>(null)
const timeout = ref<any>(null)
const now = ref<Date | null>(null)
const q = ref<InstanceType<typeof MediaQueueElement>>() as Ref<InstanceType<typeof MediaQueueElement>>

const showTimerWhenFinished = computed((): boolean => data.value ? !!data.value.settings.showTimerWhenFinished : false)
const finishedText = computed((): string => data.value ? data.value.settings.finishedText : '')
const finishined = computed((): boolean => timeLeft.value <= 0)
const running = computed((): boolean => data.value ? !!data.value.state.running : false)
const timeLeft = computed((): number => (!dateEnd.value || !now.value) ? 0 : dateEnd.value.getTime() - now.value.getTime())
const dateEnd = computed((): Date | null => (!dateStarted.value || !data.value) ? null : new Date(dateStarted.value.getTime() + data.value.state.durationMs))
const dateStarted = computed((): Date | null => !data.value ? null : new Date(JSON.parse(data.value.state.startTs)))

const timeLeftHumanReadable = computed((): string => {
  if (!data.value) {
    return ''
  }
  const left = Math.max(timeLeft.value, 0)
  const MS = 1
  const SEC = 1000 * MS
  const MIN = 60 * SEC
  const HOUR = 60 * MIN
  const hours = fn.pad(Math.floor(left / HOUR), "00")
  const min = fn.pad(Math.floor((left % HOUR) / MIN), "00")
  const sec = fn.pad(Math.floor(((left % HOUR) % MIN) / SEC), "00")
  let str = data.value.settings.timerFormat
  str = str.replace("{hh}", hours)
  str = str.replace("{mm}", min)
  str = str.replace("{ss}", sec)
  return str
})

const widgetStyles = computed((): { fontFamily: string, fontSize: string, color: string } | undefined => {
  if (!data.value) {
    return undefined
  }
  return {
    fontFamily: data.value.settings.fontFamily,
    fontSize: data.value.settings.fontSize,
    color: data.value.settings.color,
  };
})

const tick = (): void => {
  if (timeout.value) {
    clearTimeout(timeout.value);
  }
  timeout.value = setTimeout(() => {
    now.value = new Date();
    if (data.value && data.value.state.running) {
      tick();
    }
  }, 1000);
}

// @ts-ignore
import("./main.scss");

onMounted(() => {
  ws = util.wsClient(props.wdata)
  ws.onMessage("init", (d: PomoModuleWsDataData) => {
    data.value = d;
    tick();
  })
  ws.onMessage("effect", (data: PomoEffect) => {
    q.value.playmedia(newMedia({
      sound: data.sound,
      minDurationMs: 0,
    }));
  });
  ws.connect();
})

onUnmounted(() => {
  if (timeout.value) {
    clearTimeout(timeout.value);
  }
  if (ws) {
    ws.disconnect()
  }
})
</script>
