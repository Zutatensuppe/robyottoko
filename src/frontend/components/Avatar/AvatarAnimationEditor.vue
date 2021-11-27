<template>
  <div class="avatar-animation-editor">
    {{ modelValue.state }}:
    <span
      class="avatar-animation-frame"
      v-for="(frame, idx) in modelValue.frames"
      :key="idx"
    >
      <span class="button is-small" @click="removeFrame(idx)">
        <i class="fa fa-trash"></i>
      </span>
      <img v-if="frame.url" :src="frame.url" width="64" height="64" />
      <upload
        v-else
        @uploaded="imageUploaded(idx, $event)"
        accept="image/*"
        label="Upload Image"
      />
      <input class="input is-small" type="text" v-model="frame.duration" />
    </span>

    <span class="button is-small" @click="addFrame"
      ><i class="fa fa-plus"></i
    ></span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import {
  AvatarModuleAnimationDefinition,
  AvatarModuleAnimationFrameDefinition,
} from "../../../mod/modules/AvatarModule";
import { UploadedFile } from "../../../types";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<AvatarModuleAnimationDefinition>,
      required: true,
    },
  },
  methods: {
    imageUploaded(index, file: UploadedFile) {
      this.modelValue.frames[index].url = `/uploads/${file.filename}`;
    },
    removeFrame(index) {
      const frames: AvatarModuleAnimationFrameDefinition[] = [];
      for (let idx in this.modelValue.frames) {
        if (parseInt(idx, 10) === parseInt(index, 10)) {
          continue;
        }
        frames.push(this.modelValue.frames[idx]);
      }
      this.modelValue.frames = frames;
    },
    addFrame() {
      const frame: AvatarModuleAnimationFrameDefinition = {
        url: "",
        duration: 100,
      };
      this.modelValue.frames.push(frame);
    },
  },
});
</script>
<style>
.avatar-animation-frame {
  display: inline-block;
}
.avatar-animation-frame input[type="text"] {
  max-width: 100px;
}
</style>
