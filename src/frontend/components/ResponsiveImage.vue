<template>
  <div
    class="responsive-image"
    :style="style"
    :title="title"
  />
</template>
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  src: String,
  title: String,
  height: {
    type: String,
    default: "100%",
  },
  width: {
    type: String,
    default: "100%",
  },
})
const style = computed(() => ({
  display: "inline-block",
  verticalAlign: "text-bottom",
  backgroundImage: `url(${props.src})`,
  backgroundRepeat: "no-repeat",
  backgroundSize: "contain",
  backgroundPosition: "center",
  width: props.width,
  height: props.height,
}))
</script>
