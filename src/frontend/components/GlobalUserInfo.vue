<template>
  <div class="field has-text-grey-light" v-if="global.registeredUserCount">
    There are currently {{ global.registeredUserCount }} streamer{{ global.registeredUserCount > 1 ? 's' : '' }}
    registered
    ✨.
  </div>
  <div class="field has-text-grey-light" v-if="global.streamingUserCount">
    {{ global.streamingUserCount }} streamer {{ global.streamingUserCount > 1 ? 'are' : 'is' }} live right now.
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import global from "../global";

export default defineComponent({
  data: () => ({
    global: global.getData(),
  }),
})
</script>
