<template>
  <div class="avatar-slot-item-editor p-1">
    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <input
            v-model="modelValue.title"
            type="text"
            class="input is-small avatar-slot-item-editor-title"
            :class="{ 'is-static': !titleFocused }"
            @focus="titleFocused = true"
            @blur="titleFocused = false"
          >
        </div>
        <div class="level-item">
          <span
            v-if="isDefault"
            class="has-text-success mr-1"
          ><i class="fa fa-check" /> Default</span>
          <span
            v-else
            class="button is-small"
            @click="makeDefault"
          >Make default</span>
        </div>
      </div>
      <div class="level-right">
        <div class="level-item">
          <i
            class="fa fa-chevron-up is-clickable ml-1"
            @click="emit('moveUp')"
          />
        </div>
        <div class="level-item">
          <i
            class="fa fa-chevron-down is-clickable ml-1"
            @click="emit('moveDown')"
          />
        </div>
        <div class="level-item">
          <span
            class="button is-small"
            @click="emit('remove')"
          >
            <i class="fa fa-trash" />
          </span>
        </div>
      </div>
    </div>
    <AvatarSlotItemStateEditor
      v-for="(animation, idx) in modelValue.states"
      :key="idx"
      class="mr-1"
      :model-value="animation"
      :default-state="defaultState"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { AvatarModuleAvatarSlotItem, AvatarModuleSlotItemStateDefinition } from "../../../mod/modules/AvatarModuleCommon";
import AvatarSlotItemStateEditor from "./AvatarSlotItemStateEditor.vue";

const props = defineProps<{
  modelValue: AvatarModuleAvatarSlotItem
  isDefault: boolean
}>()

const emit = defineEmits<{
  (e: 'makeDefault', val: AvatarModuleAvatarSlotItem): void
  (e: 'moveUp'): void
  (e: 'moveDown'): void
  (e: 'remove'): void
}>()
const titleFocused = ref<boolean>(false)
// TODO: check if default state always exist.
const defaultState = computed(() => props.modelValue.states.find(({ state }) => state === "default") as AvatarModuleSlotItemStateDefinition)
const makeDefault = (): void => {
  emit("makeDefault", props.modelValue)
}
</script>
<style>
.avatar-slot-item-editor-title {
  font-weight: bold;
  font-size: 14px !important;
}

.avatar-slot-item-editor {
  background: #efefef;
  border: solid 1px hsl(0, 0%, 86%);
}
</style>
