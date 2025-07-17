<template>
  <input
    v-model="value"
    type="checkbox"
    @change="emitUpdate"
  >
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: any,
  onValue?: any,
  offValue?: any,
}>(), {
  onValue: true,
  offValue: false,
})

const val = ref<any>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void
}>()

const value = ref<boolean>(val.value === props.onValue)

watch(() => props.modelValue, (newVal: any) => {
  val.value = newVal
  value.value = newVal === props.onValue
})

const emitUpdate = () => {
  emit(
    'update:modelValue',
    value.value ? props.onValue : props.offValue,
  )
}
</script>
