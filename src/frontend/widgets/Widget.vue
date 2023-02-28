<template>
  <avatar-page
    v-if="data && data.widget === 'avatar'"
    :wdata="data"
    :controls="true"
  />
  <avatar-page
    v-else-if="data && data.widget === 'avatar_receive'"
    :wdata="data"
    :controls="false"
  />
  <drawcast-draw-page
    v-else-if="data && data.widget === 'drawcast_draw'"
    :wdata="data"
  />
  <drawcast-control-page
    v-else-if="data && data.widget === 'drawcast_control'"
    :wdata="data"
  />
  <drawcast-receive-page
    v-else-if="data && data.widget === 'drawcast_receive'"
    :wdata="data"
  />
  <media-page
    v-else-if="data && data.widget === 'media'"
    :wdata="data"
  />
  <emote-wall-page
    v-else-if="data && data.widget === 'emote_wall'"
    :wdata="data"
  />
  <pomo-page
    v-else-if="data && data.widget === 'pomo'"
    :wdata="data"
  />
  <speech-to-text-page
    v-else-if="data && data.widget === 'speech-to-text'"
    :wdata="data"
    :controls="true"
  />
  <speech-to-text-page
    v-else-if="data && data.widget === 'speech-to-text_receive'"
    :wdata="data"
    :controls="false"
  />
  <sr-page
    v-else-if="data && data.widget === 'sr'"
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
import api from '../api'
import AvatarPage from './avatar/Page.vue'
import DrawcastControlPage from './drawcast_control/Page.vue'
import DrawcastDrawPage from './drawcast_draw/Page.vue'
import DrawcastReceivePage from './drawcast_receive/Page.vue'
import EmoteWallPage from './emote_wall/Page.vue'
import MediaPage from './media/Page.vue'
import PomoPage from './pomo/Page.vue'
import SpeechToTextPage from './speech-to-text/Page.vue'
import SrPage from './sr/Page.vue'

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
