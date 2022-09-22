<template>
  <input
    v-model="value"
    type="checkbox"
    @change="emitUpdate"
  >
</template>
<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(defineProps<{
  modelValue: any,
  onValue?: any,
  offValue?: any,
}>(), {
  onValue: true,
  offValue: false,
})
const emit = defineEmits(["update:modelValue"])

const value = ref<boolean>(props.modelValue === props.onValue)

const emitUpdate = () => {
  emit(
    "update:modelValue",
    value.value ? props.onValue : props.offValue
  );
}
</script>
