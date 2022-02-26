<template>
  <div class="dropdown mr-1" :class="{ 'is-active': active }" ref="dropdown">
    <div class="dropdown-trigger">
      <button
        class="button is-small mr-1"
        aria-haspopup="true"
        aria-controls="dropdown-menu"
        @click="openDropdown"
      >
        <span>{{ label }}</span>
        <span class="icon is-small">
          <i class="fa fa-angle-down" aria-hidden="true"></i>
        </span>
      </button>
    </div>
    <div class="dropdown-menu" id="dropdown-menu" role="menu">
      <div class="dropdown-content">
        <span
          class="dropdown-item is-clickable"
          v-for="(action, idx) in actions"
          :key="idx"
          @click="onActionClick(action)"
          :title="action.title"
        >
          {{ action.label }}
        </span>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    label: { type: String, required: true },
    actions: { type: Array, required: true },
  },
  emits: ["click"],
  data() {
    return {
      active: false,
    };
  },
  methods: {
    onActionClick(action: any) {
      this.closeDropdown();
      this.$emit("click", action);
    },
    openDropdown() {
      this.active = true;
    },
    closeDropdown() {
      this.active = false;
    },
    hideDropdown(e: Event) {
      if (!this.$refs.dropdown) {
        return;
      }
      const el = this.$refs.dropdown as HTMLDivElement;
      if (el.contains(e.target as any)) {
        return;
      }
      this.closeDropdown();
    },
  },
  mounted() {
    window.addEventListener("click", this.hideDropdown);
  },
  unmounted() {
    window.removeEventListener("click", this.hideDropdown);
  },
});
</script>
<style scoped>
.dropdown-item {
  white-space: nowrap;
}
</style>
