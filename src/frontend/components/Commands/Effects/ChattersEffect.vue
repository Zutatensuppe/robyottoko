<template>
  <div>
    <div>Outputs the people who chatted during the stream.</div>
  </div>
</template>
<script setup lang="ts">
import { ChattersEffectData } from '../../../../types'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: ChattersEffectData,
}>()

const val = ref<ChattersEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: ChattersEffectData): void
}>()

watch(val, (newValue: ChattersEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
