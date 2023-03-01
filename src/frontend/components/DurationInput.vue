<template>
  <input
    v-model="val"
    class="input is-small spaceinput"
    :class="classes"
  >
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import fn from '../../common/fn'

const props = withDefaults(defineProps<{
  modelValue: string | number,
  allowNegative?: boolean,
}>(), {
  allowNegative: false,
})
const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void,
}>()
const val = ref<string>('')
const valid = ref<boolean>(true)

const classes = computed(() => {
  if (valid.value) {
    return []
  }
  return ['has-background-danger-light', 'has-text-danger-dark']
})

onMounted(() => {
  val.value = `${props.modelValue}`

  watch(val, (newValue) => {
    try {
      const replaced = fn.doDummyReplacements(newValue, '0')
      fn.mustParseHumanDuration(replaced, props.allowNegative)
      valid.value = true
    } catch (e) {
      valid.value = false
    }
    emit('update:modelValue', newValue)
  })
  watch(() => props.modelValue, (newValue) => {
    val.value = `${newValue}`
  })
})
</script>
