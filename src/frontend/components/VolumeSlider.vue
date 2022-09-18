<template>
  <slider-input
    v-model="volume"
    class="volume-slider"
    icon-left="fa-volume-down"
    icon-right="fa-volume-up"
    :min="0"
    :max="100"
    @update:modelValue="valChange"
  />
</template>
<script setup lang="ts">
import { ref } from "vue";

const props = defineProps({
  modelValue: { required: true },
})
const emit = defineEmits(["update:modelValue"])

const volume = ref<number>(parseInt(`${props.modelValue}`, 10))

const valChange = () => {
  emit("update:modelValue", parseInt(`${volume.value}`, 10));
}
</script>
