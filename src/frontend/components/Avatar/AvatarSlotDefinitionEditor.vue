<template>
  <div class="avatar-slot-definition-editor">
    <div class="level avatar-slot-definition-editor-title p-1">
      <div class="level-left">
        <div class="level-item">
          <AvatarAnimation
            :frames="defaultAnimation"
            :width="32"
            :height="32"
          />
        </div>
        <div class="level-item">
          <input
            v-model="modelValue.slot"
            class="input is-small avatar-slot-definition-editor-title-input"
            :class="{ 'is-static': !titleFocused }"
            @focus="titleFocused = true"
            @blur="titleFocused = false"
          >
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
    <div class="p-1">
      <AvatarSlotItemEditor
        v-for="(item, idx) in modelValue.items"
        :key="idx"
        class="card mb-1"
        :class="{ 'is-default': idx === modelValue.defaultItemIndex }"
        :model-value="item"
        :is-default="idx === modelValue.defaultItemIndex"
        @moveUp="moveItemUp(idx)"
        @moveDown="moveItemDown(idx)"
        @update:modelValue="updateItem(idx, $event)"
        @remove="removeItem(idx, $event)"
        @makeDefault="makeItemDefault(idx, $event)"
      />
    </div>

    <span
      class="button is-small"
      @click="addItem"
    >Add item</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { arraySwap } from '../../../common/fn'
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleAvatarSlotItem,
} from '../../../mod/modules/AvatarModuleCommon'
import AvatarAnimation from './AvatarAnimation.vue'
import AvatarSlotItemEditor from './AvatarSlotItemEditor.vue'

const props = defineProps<{
  modelValue: AvatarModuleAvatarSlotDefinition,
  avatarDef: AvatarModuleAvatarDefinition,
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', val: AvatarModuleAvatarSlotDefinition): void
  (e: 'remove'): void
  (e: 'moveUp'): void
  (e: 'moveDown'): void
}>()
const titleFocused = ref<boolean>(false)

const defaultItem = computed(() => {
  if (
    props.modelValue.defaultItemIndex >= 0 &&
    props.modelValue.items.length > props.modelValue.defaultItemIndex
  ) {
    return props.modelValue.items[props.modelValue.defaultItemIndex]
  }
  return null
})
const defaultAnimation = computed(() => {
  if (!defaultItem.value) {
    return []
  }
  const state = defaultItem.value.states.find(
    ({ state }) => state === 'default'
  )
  if (!state) {
    return []
  }
  return state.frames
})
const emitChange = () => {
  emit('update:modelValue', props.modelValue)
}
const updateItem = (idx: number, item: AvatarModuleAvatarSlotItem) => {
  props.modelValue.items[idx] = item
  emitChange()
}
const removeItem = (idx: number, item: AvatarModuleAvatarSlotItem) => {
  props.modelValue.items = props.modelValue.items.filter(
    (val, index) => index !== idx
  )
  if (idx <= props.modelValue.defaultItemIndex) {
    props.modelValue.defaultItemIndex = props.modelValue.defaultItemIndex - 1
  }
  if (
    props.modelValue.items.length > 0 &&
    props.modelValue.defaultItemIndex < 0
  ) {
    props.modelValue.defaultItemIndex = 0
  }
  emitChange()
}
const makeItemDefault = (idx: number, item: AvatarModuleAvatarSlotItem) => {
  props.modelValue.defaultItemIndex = idx
  emitChange()
}
const addItem = () => {
  const item: AvatarModuleAvatarSlotItem = {
    title: `${props.modelValue.slot} item ${props.modelValue.items.length + 1
      }`,
    states: props.avatarDef.stateDefinitions.map((stateDef) => ({
      state: stateDef.value,
      frames: [],
    })),
  }
  props.modelValue.items.push(item)
  if (props.modelValue.defaultItemIndex === -1) {
    props.modelValue.defaultItemIndex = 0
  }
  emitChange()
}
const moveItemUp = (idx: number) => {
  swapItems(idx - 1, idx)
}
const moveItemDown = (idx: number) => {
  swapItems(idx + 1, idx)
}
const swapItems = (idx1: number, idx2: number) => {
  if (arraySwap(props.modelValue.items, idx1, idx2)) {
    if (props.modelValue.defaultItemIndex === idx1) {
      props.modelValue.defaultItemIndex = idx2
    } else if (props.modelValue.defaultItemIndex === idx2) {
      props.modelValue.defaultItemIndex = idx1
    }
  }
}
</script>
<style>
.avatar-slot-definition-editor-title-input {
  font-weight: bold;
  font-size: 20px !important;
}

.avatar-slot-definition-editor {
  border: solid 1px hsl(0, 0%, 86%);
}

.avatar-slot-definition-editor-title {
  background: #efefef;
  border-bottom: solid 1px hsl(0, 0%, 86%);
}
</style>
