<template>
  <div
    class="avatar-preview"
    :style="{ width: `${width}px`, height: `${height}px` }"
  >
    <avatar-animation
      :frames="anim.frames"
      v-for="(anim, idx) in animations"
      :key="idx"
      :width="width"
      :height="height"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { AvatarModuleAvatarDefinition } from "../../../mod/modules/AvatarModule";

export default defineComponent({
  props: {
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
  },
  computed: {
    animations() {
      return this.avatar.slotDefinitions.map((slotDef) => {
        const item = slotDef.items[slotDef.defaultItemIndex];
        if (!item) {
          return { title: "", states: [] };
        }
        return item.states.find(({ state }) => state === "default");
      });
    },
  },
});
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
