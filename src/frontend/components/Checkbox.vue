<template>
  <input
    v-model="value"
    type="checkbox"
    @update:modelValue="emitUpdate"
  >
</template>
<script setup lang="ts">
import { PropType, ref } from "vue";

const props = defineProps({
  modelValue: {
    type: Object as PropType<any>,
    required: true,
  },
  onValue: {
    type: Object as PropType<any>,
    default: true,
  },
  offValue: {
    type: Object as PropType<any>,
    default: false,
  },
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
