<template>
  <div class="avatar-slot-item-editor">
    <span class="button is-small" @click="makeDefault"
      >Make default for slot</span
    >
    <span class="button is-small" @click="$emit('remove')">
      <i class="fa fa-trash"></i>
    </span>
    <div>
      Title:
      <input type="text" class="input is-small" v-model="modelValue.title" />
    </div>
    <div>
      States:
      <avatar-slot-item-state-editor
        v-for="(animation, idx) in modelValue.states"
        :modelValue="animation"
        @update:modelValue="updateAnimation(idx, $event)"
        :key="idx"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { AvatarModuleAvatarSlotItem } from "../../../mod/modules/AvatarModule";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<AvatarModuleAvatarSlotItem>,
      required: true,
    },
  },
  emits: ["update:modelValue", "makeDefault"],
  data: () => ({}),
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
