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
      Image:
      <img v-if="modelValue.url" :src="modelValue.url" width="64" height="64" />
      <upload
        v-else
        @uploaded="imageUploaded"
        accept="image/*"
        label="Upload Image"
      />
    </div>
    <div>
      Animation:
      <avatar-animation-editor
        v-for="(animation, idx) in modelValue.animation"
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
import { UploadedFile } from "../../../types";
import AvatarAnimationEditor from "./AvatarAnimationEditor.vue";

export default defineComponent({
  components: { AvatarAnimationEditor },
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
    imageUploaded(file: UploadedFile) {
      this.modelValue.url = `/uploads/${file.filename}`;
    },
    makeDefault() {
      this.$emit("makeDefault", this.modelValue);
    },
  },
});
</script>
