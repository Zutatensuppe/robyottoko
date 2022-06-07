<template>
  <div class="dropdown" :class="{ 'is-active': active }" ref="dropdown">
    <div class="dropdown-trigger">
      <input type="text" class="input is-small" :class="$attrs.class" v-model="value" @focus="openDropdown" />
      <span class="icon is-small is-left" v-if="icon">
        <i class="fa" :class="[`fa-${icon}`]"></i>
      </span>
    </div>
    <div class="dropdown-menu" id="dropdown-menu" role="menu">
      <div class="dropdown-content">
        <a class="dropdown-item" v-for="(autocompleteVar, idx) in autocompletableVariables(value)" :key="idx"
          @click="onClick(autocompleteVar)" v-html="autocompleteVar.label"></a>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, PropType, ref, Ref, watch } from 'vue'

interface OneValue {
  value: string,
  label: string,
}

const props = defineProps({
  modelValue: { type: String, required: true },
  // maybe instead of values provide a autocomplete function?
  values: { type: Array as PropType<OneValue[]>, required: true },
  icon: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'focus'])

const value = ref<string>(props.modelValue)

const autocompletableVariables = (search: string): OneValue[] => {
  return props.values.filter((v) => v.value.includes(search));
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
  window.addEventListener("click", hideDropdown)
  watch(value, (newVal) => {
    emit('update:modelValue', newVal)
  })
  watch(() => props.modelValue, (newVal) => {
    value.value = newVal
  })
})
onUnmounted(() => {
  window.removeEventListener("click", hideDropdown)
})
</script>
