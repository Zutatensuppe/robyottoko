<template>
  <div
    ref="dropdown"
    class="dropdown"
    :class="{ 'is-active': active }"
  >
    <div class="dropdown-trigger">
      <input
        v-model="value"
        type="text"
        class="input is-small"
        :class="$attrs.class"
        @focus="openDropdown"
      >
      <span
        v-if="icon"
        class="icon is-small is-left"
      >
        <i
          class="fa"
          :class="[`fa-${icon}`]"
        />
      </span>
    </div>
    <div
      id="dropdown-menu"
      class="dropdown-menu"
      role="menu"
    >
      <div class="dropdown-content">
        <a
          v-for="(autocompleteVar, idx) in autocompletableVariables(value)"
          :key="idx"
          class="dropdown-item"
          @click="onClick(autocompleteVar)"
          v-html="autocompleteVar.label"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref, Ref, watch } from 'vue'

interface OneValue {
  value: string,
  label: string,
}

const props = withDefaults(defineProps<{
  modelValue: string,
  values: OneValue[],
  icon?: string,
}>(), {
  icon: '',
})
const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const value = ref<string>(props.modelValue)

const autocompletableVariables = (search: string): OneValue[] => {
  return props.values.filter((v) => v.value.includes(search))
}

const active = ref<boolean>(false)
const dropdown = ref<HTMLDivElement>() as Ref<HTMLDivElement>

const onClick = (autocompleteVar: OneValue) => {
  value.value = autocompleteVar.value
  closeDropdown()
}

const openDropdown = () => {
  active.value = true
}

const closeDropdown = () => {
  active.value = false
}

const hideDropdown = (e: Event) => {
  if (!dropdown.value || dropdown.value.contains(e.target as any)) {
    return
  }
  closeDropdown()
}

onMounted(() => {
  window.addEventListener('click', hideDropdown)
  watch(value, (newVal) => {
    emit('update:modelValue', newVal)
  })
  watch(() => props.modelValue, (newVal) => {
    value.value = newVal
  })
})
onUnmounted(() => {
  window.removeEventListener('click', hideDropdown)
})
</script>
