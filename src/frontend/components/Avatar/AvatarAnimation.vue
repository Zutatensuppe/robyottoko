<template>
  <span
    class="avatar-animation"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
    }"
  >
    <img
      v-if="src"
      :src="src"
      :width="width"
      :height="height"
    >
    <span
      v-else
      :style="{
        width: `${width}px`,
        height: `${height}px`,
        display: 'inline-block',
      }"
    />
  </span>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { AvatarModuleAnimationFrameDefinition } from '../../../mod/modules/AvatarModuleCommon'

const props = withDefaults(defineProps<{
  frames: AvatarModuleAnimationFrameDefinition[],
  width?: number,
  height?: number,
}>(), {
  width: 64,
  height: 64,
})
const timeout = ref<ReturnType<typeof setTimeout> | null>(null)
const idx = ref<number>(-1)

const src = computed(() => {
  if (idx.value >= 0 && idx.value < props.frames.length) {
    return props.frames[idx.value].url
  }
  return ''
})

const nextFrame = () => {
  if (props.frames.length === 0) {
    idx.value = -1
    return
  }
  if (timeout.value) {
    clearTimeout(timeout.value)
    timeout.value = null
  }
  idx.value++
  if (idx.value >= props.frames.length) {
    idx.value = 0
  }
  timeout.value = setTimeout(() => {
    nextFrame()
  }, props.frames[idx.value].duration)
}

onMounted(() => {
  nextFrame()
  watch(() => props.frames, () => {
    // reset to the first frame when frames change
    idx.value = -1
    nextFrame()
  }, { deep: true })
})

onUnmounted(() => {
  if (timeout.value) {
    clearTimeout(timeout.value)
    timeout.value = null
  }
})
</script>
