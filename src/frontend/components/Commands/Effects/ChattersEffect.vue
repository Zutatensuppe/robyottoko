<template>
  <div>
    <div>Outputs the people who chatted during the stream.</div>
  </div>
</template>
<script setup lang="ts">
import { ChattersEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: ChattersEffect,
}>()

const val = ref<ChattersEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue'])

watch(val, (newValue: ChattersEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
