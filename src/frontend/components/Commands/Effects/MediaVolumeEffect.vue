<template>
  <div>
    <div>Changes the volume of media files played. (Volume: argument to this command, min 0, max 100)</div>
  </div>
</template>
<script setup lang="ts">
import { MediaVolumeEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: MediaVolumeEffect,
}>()

const val = ref<MediaVolumeEffect>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: MediaVolumeEffect): void
}>()

watch(val, (newValue: MediaVolumeEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
