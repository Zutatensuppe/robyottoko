<template>
  <span v-if="tag === 'span'">{{ humanReadable }}</span><code v-else>{{ humanReadable }}</code>
</template>

<script setup lang="ts">
import { computed } from "vue";
import fn from "../../common/fn";

const props = defineProps({
  value: { required: true },
})

const tag = computed(() => {
  try {
    fn.mustParseHumanDuration(`${props.value}`);
    return "span";
  } catch (e) {
    return "code";
  }
})

const humanReadable = computed(() => {
  try {
    return fn.humanDuration(fn.mustParseHumanDuration(`${props.value}`));
  } catch (e) {
    return props.value;
  }
})
</script>
