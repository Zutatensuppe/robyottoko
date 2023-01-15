<template>
  <div>
    <div
      v-for="(item, idx) in val"
      :key="idx"
      class="field has-addons mr-1"
    >
      <div class="control">
        <input
          v-model="val[idx]"
          class="input is-small"
          :placeholder="placeholder"
          type="text"
        >
      </div>
      <div class="control">
        <button
          class="button is-small"
          @click="rm(idx)"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <span
      class="button is-small"
      @click="add('')"
    >Add another</span>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string[],
  placeholder?: string,
}>()

const val = ref<string[]>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: string[]): void
}>()

const add = (str: string) => {
  val.value.push(str)
}
const rm = (index: number) => {
  val.value = val.value.filter((_val, idx) => idx !== index)
}

watch(() => props.modelValue, (value: string[]) => {
  val.value = value
})

watch(val, (value: string[]) => {
  emit('update:modelValue', value)
}, { deep: true })
</script>
