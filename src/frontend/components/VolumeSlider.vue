<template>
  <slider class="volume-slider" iconLeft="fa-volume-down" iconRight="fa-volume-up" :min="0" :max="100" v-model="volume"
    @update:modelValue="valChange" />
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
