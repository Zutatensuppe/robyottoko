<template>
  <div class="avatar-slot-item-editor p-1">
    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <input
            v-model="val.title"
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
      v-for="(_animation, idx) in val.states"
      :key="idx"
      v-model="val.states[idx]"
      class="mr-1"
      :default-state="defaultState"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AvatarModuleAvatarSlotItem, AvatarModuleSlotItemStateDefinition } from '../../../mod/modules/AvatarModuleCommon'
import AvatarSlotItemStateEditor from './AvatarSlotItemStateEditor.vue'

const props = defineProps<{
  modelValue: AvatarModuleAvatarSlotItem
  isDefault: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: AvatarModuleAvatarSlotItem): void
  (e: 'makeDefault'): void
  (e: 'moveUp'): void
  (e: 'moveDown'): void
  (e: 'remove'): void
}>()

const val = ref<AvatarModuleAvatarSlotItem>(JSON.parse(JSON.stringify(props.modelValue)))
const currentValJson = computed(() => JSON.stringify(val.value))

const titleFocused = ref<boolean>(false)
// TODO: check if default state always exist.
const defaultState = computed(() => val.value.states.find(({ state }) => state === 'default') as AvatarModuleSlotItemStateDefinition)
const makeDefault = (): void => {
  emit('makeDefault')
}

watch(() => props.modelValue, (value: AvatarModuleAvatarSlotItem) => {
  if (currentValJson.value !== JSON.stringify(value)) {
    val.value = value
  }
})

watch(val, (value: AvatarModuleAvatarSlotItem) => {
  emit('update:modelValue', value)
}, { deep: true })
</script>
