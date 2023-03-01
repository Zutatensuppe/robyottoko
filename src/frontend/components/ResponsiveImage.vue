<template>
  <div
    class="responsive-image"
    :style="style"
    :title="title"
  />
</template>
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  src: string,
  title: string,
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: '100%',
})

const style = computed(() => ({
  display: 'inline-block',
  verticalAlign: 'text-bottom',
  backgroundImage: `url(${props.src})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'contain',
  backgroundPosition: 'center',
  width: props.width,
  height: props.height,
}))
</script>
