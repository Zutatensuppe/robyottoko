<template>
  <div
    ref="dropdown"
    class="dropdown mr-1"
    :class="{ 'is-active': active }"
  >
    <div class="dropdown-trigger">
      <button
        class="button is-small mr-1"
        aria-haspopup="true"
        aria-controls="dropdown-menu"
        @click="openDropdown"
      >
        <span>{{ label }}</span>
        <span class="icon is-small">
          <i
            class="fa fa-angle-down"
            aria-hidden="true"
          />
        </span>
      </button>
    </div>
    <div
      id="dropdown-menu"
      class="dropdown-menu"
      role="menu"
    >
      <div class="dropdown-content">
        <span
          v-for="(action, idx) in actions"
          :key="idx"
          class="dropdown-item is-clickable"
          :title="action.title"
          @click="onActionClick(action)"
        >
          {{ action.label }}
        </span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, Ref, ref } from 'vue'

interface Action { title: string, label: string }
defineProps<{
  label: string
  actions: Action[]
}>()

const emit = defineEmits<{
  (e: 'click', val: Action): void
}>()

const active = ref<boolean>(false)
const dropdown = ref<HTMLDivElement>() as Ref<HTMLDivElement>

const openDropdown = () => {
  active.value = true
}

const closeDropdown = () => {
  active.value = false
}

const onActionClick = (action: Action) => {
  closeDropdown()
  emit('click', action)
}

const hideDropdown = (e: Event) => {
  if (!dropdown.value || dropdown.value.contains(e.target as any)) {
    return
  }
  closeDropdown()
}

onMounted(() => {
  window.addEventListener('click', hideDropdown)
})
onUnmounted(() => {
  window.removeEventListener('click', hideDropdown)
})
</script>
<style scoped>
.dropdown-item {
  white-space: nowrap;
}
</style>
