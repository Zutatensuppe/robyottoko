<template>
  <input
    v-model="val"
    class="input is-small"
    :placeholder="placeholder"
    type="text"
  >
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: number,
  placeholder?: string,
}>()

const val = ref<string>(`${props.modelValue}`)

interface Emits {
  (event: 'update:modelValue', modelValue: number): void
}

const emit = defineEmits<Emits>()

watch(() => props.modelValue, (value: number) => {
  val.value = `${value}`
})

watch(val, (value: string) => {
  const number = parseInt(`${value}`, 10)
  emit('update:modelValue', isNaN(number) ? 0 : number)
}, { deep: true })
</script>
