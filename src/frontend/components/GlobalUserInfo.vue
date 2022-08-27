<template>
  <div
    v-if="global.registeredUserCount"
    class="field has-text-grey-light"
  >
    There are currently {{ global.registeredUserCount }} streamer{{ global.registeredUserCount > 1 ? 's' : '' }}
    registered
    ✨.
  </div>
  <div
    v-if="global.streamingUserCount"
    class="field has-text-grey-light"
  >
    {{ global.streamingUserCount }} streamer {{ global.streamingUserCount > 1 ? 'are' : 'is' }} live right now.
  </div>
</template>
<script setup lang="ts">
import g from "../global";
const global = g.getData()
</script>
