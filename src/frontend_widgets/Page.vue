<template>
  <avatar-page v-if="widget === 'avatar'" :controls="true" widget="avatar" />
  <avatar-page v-else-if="widget === 'avatar_receive'" :controls="false" widget="avatar_receive" />
  <drawcast-draw-page v-else-if="widget === 'drawcast_draw'" />
  <drawcast-control-page v-else-if="widget === 'drawcast_control'" />
  <drawcast-receive-page v-else-if="widget === 'drawcast_receive'" />
  <media-page v-else-if="widget === 'media'" />
  <pomo-page v-else-if="widget === 'pomo'" />
  <speech-to-text-page v-else-if="widget === 'speech-to-text'" :controls="true" widget="speech-to-text" />
  <speech-to-text-page v-else-if="widget === 'speech-to-text_receive'" :controls="false"
    widget="speech-to-text_receive" />
  <sr-page v-else-if="widget === 'sr'" />
</template>
<script lang="ts">
import { defineComponent } from "vue";

import AvatarPage from './avatar/Page.vue'
import DrawcastDrawPage from './drawcast_draw/Page.vue'
import DrawcastControlPage from './drawcast_control/Page.vue'
import DrawcastReceivePage from './drawcast_receive/Page.vue'
import MediaPage from './media/Page.vue'
import PomoPage from './pomo/Page.vue'
import SpeechToTextPage from './speech-to-text/Page.vue';
import SrPage from './sr/Page.vue'

export default defineComponent({
  components: {
    AvatarPage,
    DrawcastDrawPage,
    DrawcastControlPage,
    DrawcastReceivePage,
    MediaPage,
    PomoPage,
    SpeechToTextPage,
    SrPage,
  },
  props: {
    widget: { type: String, required: true },
  },
  created() {
    document.documentElement.classList.add(this.widget)
  },
})
</script>
