<template>
  <div class="dropdown mr-1" :class="{ 'is-active': active }" ref="dropdown">
    <div class="dropdown-trigger">
      <button class="button is-small mr-1" aria-haspopup="true" aria-controls="dropdown-menu" @click="openDropdown">
        <span>{{ label }}</span>
        <span class="icon is-small">
          <i class="fa fa-angle-down" aria-hidden="true"></i>
        </span>
      </button>
    </div>
    <div class="dropdown-menu" id="dropdown-menu" role="menu">
      <div class="dropdown-content">
        <span class="dropdown-item is-clickable" v-for="(action, idx) in actions" :key="idx"
          @click="onActionClick(action)" :title="action.title">
          {{ action.label }}
        </span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, PropType, Ref, ref } from "vue";

defineProps({
  label: { type: String, required: true },
  actions: { type: Array as PropType<{ title: string, label: string }[]>, required: true },
})

const emit = defineEmits(["click"])

const active = ref<boolean>(false)
const dropdown = ref<HTMLDivElement>() as Ref<HTMLDivElement>

const openDropdown = () => {
  active.value = true
}

const closeDropdown = () => {
  active.value = false
}

const onActionClick = (action: any) => {
  closeDropdown();
  emit('click', action)
}

const hideDropdown = (e: Event) => {
  if (!dropdown.value || dropdown.value.contains(e.target as any)) {
    return
  }
  closeDropdown()
}

onMounted(() => {
  window.addEventListener("click", hideDropdown)
})
onUnmounted(() => {
  window.removeEventListener("click", hideDropdown)
})
</script>
<style scoped>
.dropdown-item {
  white-space: nowrap;
}
</style>
