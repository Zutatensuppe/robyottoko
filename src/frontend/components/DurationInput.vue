<template>
  <input class="input is-small spaceinput" :class="classes" v-model="v" />
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import fn from "../../common/fn";

const props = defineProps({
  modelValue: { required: true },
  allowNegative: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const v = ref<string>("")
const valid = ref<boolean>(true)

const classes = computed(() => {
  if (valid.value) {
    return [];
  }
  return ["has-background-danger-light", "has-text-danger-dark"];
})

onMounted(() => {
  v.value = `${props.modelValue}`;

  watch(v, (newValue) => {
    try {
      const r = fn.doDummyReplacements(newValue, "0");
      fn.mustParseHumanDuration(r, props.allowNegative);
      valid.value = true;
    } catch (e) {
      valid.value = false;
    }
    emit("update:modelValue", newValue);
  })
  watch(() => props.modelValue, (newValue) => {
    v.value = `${newValue}`;
  })
})
</script>
