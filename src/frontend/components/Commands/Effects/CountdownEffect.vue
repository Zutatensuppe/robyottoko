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
import { CountdownEffectData } from '../../../../types';
import CountdownEditor from '../CountdownEditor.vue'

const props = defineProps<{
  modelValue: CountdownEffectData,
  baseVolume: number,
}>()

const val = ref<CountdownEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: CountdownEffectData): void
}>()

watch(val, (newValue: CountdownEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
