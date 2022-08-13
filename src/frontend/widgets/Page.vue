<template>
  <avatar-page v-if="widget === 'avatar'" :wdata="data" :controls="true" />
  <avatar-page v-else-if="widget === 'avatar_receive'" :wdata="data" :controls="false" />
  <drawcast-draw-page v-else-if="widget === 'drawcast_draw'" :wdata="data" />
  <drawcast-control-page v-else-if="widget === 'drawcast_control'" :wdata="data" />
  <drawcast-receive-page v-else-if="widget === 'drawcast_receive'" :wdata="data" />
  <media-page v-else-if="widget === 'media'" :wdata="data" />
  <pomo-page v-else-if="widget === 'pomo'" :wdata="data" />
  <speech-to-text-page v-else-if="widget === 'speech-to-text'" :wdata="data" :controls="true" />
  <speech-to-text-page v-else-if="widget === 'speech-to-text_receive'" :wdata="data" :controls="false" />
  <sr-page v-else-if="widget === 'sr'" :wdata="data" />
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
import api from "../api";
import { WidgetApiData } from "./util";

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
  data: (): { data: null | WidgetApiData } => ({
    data: null
  }),
  created() {
    console.log(this.$route)
    // document.documentElement.classList.add(this.widget)
  },
  computed: {
    widget () {
      return this.data ? this.data.widget : null
    },
  },
  async created() {
    const res = await api.getWidgetData(
      this.$route.params.widget_type,
      this.$route.params.widget_token,
    );
    if (res.status !== 200) {
      // TODO: do something better
      console.log('error...')
      return;
    }

    const data: WidgetApiData = await res.json();
    document.title = data.title
    this.data = data
  },
})
</script>
