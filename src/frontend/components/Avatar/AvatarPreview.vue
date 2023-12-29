<template>
  <div
    class="avatar-preview"
    :style="{ width: `${width}px`, height: `${height}px` }"
  >
    <AvatarAnimation
      v-for="(anim, idx) in animations"
      :key="idx"
      :frames="anim.frames"
      :width="width"
      :height="height"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AvatarModuleAvatarDefinition, AvatarModuleSlotItemStateDefinition } from '../../../mod/modules/AvatarModuleCommon'
import AvatarAnimation from './AvatarAnimation.vue'

const props = withDefaults(defineProps<{
  avatar: AvatarModuleAvatarDefinition,
  width?: number,
  height?: number,
}>(), {
  width: 64,
  height: 64,
})

const animations = computed((): AvatarModuleSlotItemStateDefinition[] => {
  return props.avatar.slotDefinitions.map((slotDef) => {
    const item = slotDef.items[slotDef.defaultItemIndex]
    if (!item) {
      return { state: '', frames: [] }
    }
    const stateDef = item.states.find(({ state }) => state === 'default')
    if (!stateDef) {
      return { state: '', frames: [] }
    }
    return stateDef
  })
})
</script>
