<template>
  <div>
    <CountdownEditor
      v-model="val.data"
      :base-volume="baseVolume"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { CountdownEffect } from '../../../../types';
import CountdownEditor from '../CountdownEditor.vue'

const props = defineProps<{
  modelValue: CountdownEffect,
  baseVolume: number,
}>()

const val = ref<CountdownEffect>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: CountdownEffect): void
}>()

watch(val, (newValue: CountdownEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
