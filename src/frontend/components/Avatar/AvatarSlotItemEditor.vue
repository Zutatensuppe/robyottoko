<template>
  <div class="avatar-slot-item-editor p-1">
    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <input type="text" class="input is-small avatar-slot-item-editor-title"
            :class="{ 'is-static': !titleFocused }" @focus="titleFocused = true" @blur="titleFocused = false"
            v-model="modelValue.title" />
        </div>
        <div class="level-item">
          <span v-if="isDefault" class="has-text-success mr-1"><i class="fa fa-check" /> Default</span>
          <span v-else class="button is-small" @click="makeDefault">Make default</span>
        </div>
      </div>
      <div class="level-right">
        <div class="level-item">
          <i class="fa fa-chevron-up is-clickable ml-1" @click="$emit('moveUp')"></i>
        </div>
        <div class="level-item">
          <i class="fa fa-chevron-down is-clickable ml-1" @click="$emit('moveDown')"></i>
        </div>
        <div class="level-item">
          <span class="button is-small" @click="$emit('remove')">
            <i class="fa fa-trash"></i>
          </span>
        </div>
      </div>
    </div>
    <avatar-slot-item-state-editor class="mr-1" v-for="(animation, idx) in modelValue.states" :modelValue="animation"
      :defaultState="defaultState" @update:modelValue="updateAnimation(idx, $event)" :key="idx" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { AvatarModuleAvatarSlotItem } from "../../../mod/modules/AvatarModuleCommon";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<AvatarModuleAvatarSlotItem>,
      required: true,
    },
    isDefault: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["update:modelValue", "makeDefault", "moveUp", "moveDown", "remove"],
  data: () => ({
    titleFocused: false,
  }),
  computed: {
    defaultState() {
      return this.modelValue.states.find(({ state }) => state === "default");
    },
  },
  methods: {
    updateAnimation(index, animation) {
      // TODO:
    },
    makeDefault() {
      this.$emit("makeDefault", this.modelValue);
    },
  },
});
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
