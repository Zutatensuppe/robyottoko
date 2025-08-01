<template>
  <div>
    <div>Changes the volume of media files played. (Volume: argument to this command, min 0, max 100)</div>
  </div>
</template>
<script setup lang="ts">
import type { MediaVolumeEffectData } from '../../../../types'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: MediaVolumeEffectData,
}>()

const val = ref<MediaVolumeEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: MediaVolumeEffectData): void
}>()

watch(val, (newValue: MediaVolumeEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
