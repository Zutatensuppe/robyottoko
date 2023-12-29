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
            v-model="val.slot"
            class="input is-small avatar-slot-definition-editor-title-input"
            :class="{ 'is-static': !titleFocused }"
            @update:model-value="emitChange"
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
        v-for="(item, idx) in val.items"
        :key="idx"
        class="card mb-1"
        :class="{ 'is-default': idx === val.defaultItemIndex }"
        :model-value="item"
        :is-default="idx === val.defaultItemIndex"
        @move-up="moveItemUp(idx)"
        @move-down="moveItemDown(idx)"
        @update:model-value="updateItem(idx, $event)"
        @remove="removeItem(idx)"
        @make-default="makeItemDefault(idx)"
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

const val = ref<AvatarModuleAvatarSlotDefinition>(JSON.parse(JSON.stringify(props.modelValue)))

const titleFocused = ref<boolean>(false)

const defaultItem = computed(() => {
  if (
    val.value.defaultItemIndex >= 0 &&
    val.value.items.length > val.value.defaultItemIndex
  ) {
    return val.value.items[val.value.defaultItemIndex]
  }
  return null
})
const defaultAnimation = computed(() => {
  if (!defaultItem.value) {
    return []
  }
  const state = defaultItem.value.states.find(
    ({ state }) => state === 'default',
  )
  if (!state) {
    return []
  }
  return state.frames
})
const emitChange = () => {
  emit('update:modelValue', val.value)
}
const updateItem = (idx: number, item: AvatarModuleAvatarSlotItem) => {
  val.value.items[idx] = item
  emitChange()
}
const removeItem = (idx: number) => {
  val.value.items = val.value.items.filter(
    (val, index) => index !== idx,
  )
  if (idx <= val.value.defaultItemIndex) {
    val.value.defaultItemIndex = val.value.defaultItemIndex - 1
  }
  if (
    val.value.items.length > 0 &&
    val.value.defaultItemIndex < 0
  ) {
    val.value.defaultItemIndex = 0
  }
  emitChange()
}
const makeItemDefault = (idx: number) => {
  val.value.defaultItemIndex = idx
  emitChange()
}
const addItem = () => {
  const item: AvatarModuleAvatarSlotItem = {
    title: `${val.value.slot} item ${val.value.items.length + 1}`,
    states: props.avatarDef.stateDefinitions.map((stateDef) => ({
      state: stateDef.value,
      frames: [],
    })),
  }
  val.value.items.push(item)
  if (val.value.defaultItemIndex === -1) {
    val.value.defaultItemIndex = 0
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
  if (arraySwap(val.value.items, idx1, idx2)) {
    if (val.value.defaultItemIndex === idx1) {
      val.value.defaultItemIndex = idx2
    } else if (val.value.defaultItemIndex === idx2) {
      val.value.defaultItemIndex = idx1
    }
  }
}
</script>
