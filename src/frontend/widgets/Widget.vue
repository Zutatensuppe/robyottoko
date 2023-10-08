<template>
  <AvatarWidget
    v-if="data && data.widget === 'avatar'"
    :wdata="data"
    :controls="true"
  />
  <AvatarWidget
    v-else-if="data && data.widget === 'avatar_receive'"
    :wdata="data"
    :controls="false"
  />
  <DrawcastDrawWidget
    v-else-if="data && data.widget === 'drawcast_draw'"
    :wdata="data"
  />
  <DrawcastControlWidget
    v-else-if="data && data.widget === 'drawcast_control'"
    :wdata="data"
  />
  <DrawcastReceiveWidget
    v-else-if="data && data.widget === 'drawcast_receive'"
    :wdata="data"
  />
  <MediaWidget
    v-else-if="data && data.widget === 'media'"
    :wdata="data"
  />
  <EmoteWallWidget
    v-else-if="data && data.widget === 'emote_wall'"
    :wdata="data"
  />
  <PomoWidget
    v-else-if="data && data.widget === 'pomo'"
    :wdata="data"
  />
  <SpeechToTextWidget
    v-else-if="data && data.widget === 'speech-to-text'"
    :wdata="data"
    :controls="true"
  />
  <SpeechToTextWidget
    v-else-if="data && data.widget === 'speech-to-text_receive'"
    :wdata="data"
    :controls="false"
  />
  <SrWidget
    v-else-if="data && data.widget === 'sr'"
    :wdata="data"
  />
  <RouletteWidget
    v-else-if="data && data.widget === 'roulette'"
    :wdata="data"
  />
  <div v-else-if="!error">
    Loading...
  </div>
  <div v-else>
    {{ error }}
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { WidgetApiData } from './util'
import api from '../_api'
import AvatarWidget from './avatar/AvatarWidget.vue'
import DrawcastControlWidget from './drawcast_control/DrawcastControlWidget.vue'
import DrawcastDrawWidget from './drawcast_draw/DrawcastDrawWidget.vue'
import DrawcastReceiveWidget from './drawcast_receive/DrawcastReceiveWidget.vue'
import EmoteWallWidget from './emote_wall/EmoteWallWidget.vue'
import MediaWidget from './media/MediaWidget.vue'
import PomoWidget from './pomo/PomoWidget.vue'
import SpeechToTextWidget from './speech-to-text/SpeechToTextWidget.vue'
import SrWidget from './sr/SrWidget.vue'
import RouletteWidget from './roulette/RouletteWidget.vue'

const data = ref<WidgetApiData | null>(null)
const error = ref<string>('')
const route = useRoute()

onMounted(async () => {
  const rp = route.params
  const res = route.name === 'pub'
    ? await api.getPubData(`${rp.pub_id}`)
    : await api.getWidgetData(`${rp.widget_type}`, `${rp.widget_token}`)
  if (res.status !== 200) {
    error.value = 'Widget not found...'
    return
  }

  const widgetData: WidgetApiData = await res.json()
  document.title = widgetData.title
  data.value = widgetData
})
</script>
