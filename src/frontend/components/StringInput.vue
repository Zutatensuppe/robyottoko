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
  modelValue: string,
  placeholder?: string,
}>()

const val = ref<string>(props.modelValue)

interface Emits {
  (event: 'update:modelValue', modelValue: string): void
}

const emit = defineEmits<Emits>()

watch(() => props.modelValue, (value: string) => {
  val.value = value
})

watch(val, (value: string) => {
  emit('update:modelValue', value)
}, { deep: true })
</script>
