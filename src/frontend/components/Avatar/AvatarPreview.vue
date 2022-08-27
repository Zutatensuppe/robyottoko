<template>
  <div
    class="avatar-preview"
    :style="{ width: `${width}px`, height: `${height}px` }"
  >
    <avatar-animation
      v-for="(anim, idx) in animations"
      :key="idx"
      :frames="anim.frames"
      :width="width"
      :height="height"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from "vue";
import { AvatarModuleAvatarDefinition, AvatarModuleSlotItemStateDefinition } from "../../../mod/modules/AvatarModuleCommon";

const props = defineProps({
  avatar: {
    type: Object as PropType<AvatarModuleAvatarDefinition>,
    required: true,
  },
  width: {
    type: Number,
    required: false,
    default: 64,
  },
  height: {
    type: Number,
    required: false,
    default: 64,
  },
})

const animations = computed((): AvatarModuleSlotItemStateDefinition[] => {
  return props.avatar.slotDefinitions.map((slotDef) => {
    const item = slotDef.items[slotDef.defaultItemIndex];
    if (!item) {
      return { state: "", frames: [] };
    }
    return item.states.find(({ state }) => state === "default");
  });
})
</script>
<style>
.avatar-preview {
  position: relative;
}

.avatar-preview .avatar-animation {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
