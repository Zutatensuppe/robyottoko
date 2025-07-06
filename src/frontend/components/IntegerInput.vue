<template>
  <input
    v-model="val"
    class="input is-small"
    :placeholder="placeholder"
    type="number"
  >
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: number,
  placeholder?: string,
}>()

const val = ref<string>(`${props.modelValue}`)

const emit = defineEmits<{
  (e: 'update:modelValue', val: number): void
}>()

watch(() => props.modelValue, (value: number) => {
  val.value = `${value}`
})

watch(val, (value: string) => {
  const number = parseInt(`${value}`, 10)
  emit('update:modelValue', isNaN(number) ? 0 : number)
}, { deep: true })
</script>
