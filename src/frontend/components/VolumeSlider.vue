<template>
  <SliderInput
    v-model="volume"
    class="volume-slider"
    icon-left="fa-volume-down"
    icon-right="fa-volume-up"
    :min="0"
    :max="100"
    @update:model-value="valChange"
  />
</template>
<script setup lang="ts">
import { ref } from 'vue'
import SliderInput  from './SliderInput.vue'

const props = defineProps<{
  modelValue: string | number
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', val: number): void
}>()

const volume = ref<number>(parseInt(`${props.modelValue}`, 10))

const valChange = () => {
  emit('update:modelValue', parseInt(`${volume.value}`, 10))
}
</script>
