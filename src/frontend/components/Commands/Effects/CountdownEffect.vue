<template>
  <div>
    <countdown-editor
      v-model="val.data"
      :base-volume="baseVolume"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { CountdownEffect } from '../../../../types';

const props = defineProps<{
  modelValue: CountdownEffect,
  baseVolume: number,
}>()

const val = ref<CountdownEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue'])

watch(val, (newValue: CountdownEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
