<template>
  <div
    class="avatar-slot-item-state-editor card"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @drop="onDrop"
  >
    <div class="avatar-slot-item-state-editor-title">
      {{ modelValue.state }}
    </div>
    <avatar-animation
      :frames="modelValue.frames"
      v-if="modelValue.frames.length"
    />
    <avatar-animation
      v-else
      :frames="defaultState.frames"
      class="avatar-fallback-animation"
    />
    <div>
      <div
        class="avatar-animation-card mr-1"
        v-for="(frame, idx) in modelValue.frames"
        :key="idx"
      >
        <span class="avatar-animation-frame">
          <div class="avatar-animation-frame-remove">
            <span class="button is-small" @click="removeFrame(idx)">
              <i class="fa fa-trash"></i>
            </span>
          </div>
          <img v-if="frame.url" :src="frame.url" width="64" height="64" />

          <upload
            v-else
            @uploaded="imageUploaded(idx, $event)"
            accept="image/*"
            label=""
            class="avatar-animation-frame-upload"
          />
          <input class="input is-small" type="text" v-model="frame.duration" />
        </span>
      </div>

      <div class="avatar-animation-card mr-1">
        <span class="avatar-animation-frame">
          <span class="button is-small" @click="addFrame"
            ><i class="fa fa-plus"></i
          ></span>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import {
  AvatarModuleSlotItemStateDefinition,
  AvatarModuleAnimationFrameDefinition,
} from "../../../mod/modules/AvatarModule";
import { UploadedFile } from "../../../types";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<AvatarModuleSlotItemStateDefinition>,
      required: true,
    },
    defaultState: {
      type: Object as PropType<AvatarModuleSlotItemStateDefinition>,
      required: true,
    },
  },
  data() {
    return {
      editing: false,
    };
  },
  methods: {
    onDragOver($evt) {
      if ($evt.dataTransfer.getData("avatar-image-url")) {
        $evt.preventDefault();
      }
    },
    onDragEnter($evt) {
      if ($evt.dataTransfer.getData("avatar-image-url")) {
        $evt.preventDefault();
      }
    },
    onDrop($evt) {
      if ($evt.dataTransfer.getData("avatar-image-url")) {
        $evt.preventDefault();
        const frame: AvatarModuleAnimationFrameDefinition = {
          url: $evt.dataTransfer.getData("avatar-image-url"),
          duration: 100,
        };
        this.modelValue.frames.push(frame);
      }
    },
    onOverlayClick() {
      this.editing = false;
    },
    imageUploaded(index: number, file: UploadedFile) {
      this.modelValue.frames[index].url = `/uploads/${file.filename}`;
    },
    removeFrame(idx: number) {
      this.modelValue.frames = this.modelValue.frames.filter(
        (val, index) => index !== idx
      );
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
.avatar-slot-item-state-editor {
  display: inline-block;
  border: solid 1px hsl(0, 0%, 86%);
}
.avatar-slot-item-state-editor-title {
  text-align: center;
  font-weight: bold;
  background: #efefef;
  border-bottom: solid 1px hsl(0, 0%, 86%);
}
.avatar-animation-card {
  display: inline-block;
  width: 64px;
  vertical-align: top;
}
.avatar-animation-frame {
  display: inline-block;
  position: relative;
  background: #efefef;
}
.avatar-animation-frame img {
  vertical-align: bottom;
}
.avatar-animation-frame-upload {
  width: 64px;
  height: 64px;
  display: flex !important;
  align-items: center;
  text-align: center;
  z-index: 1;
}
.avatar-animation-frame-upload .button {
  margin: 0 auto;
}
.avatar-animation-frame-remove {
  position: absolute;
  right: 0;
  top: 0;
  display: none;
  z-index: 2;
}
.avatar-animation-frame:hover .avatar-animation-frame-remove {
  display: inline-block;
}
.avatar-animation-frame input[type="text"] {
  max-width: 100px;
}
.avatar-fallback-animation {
  opacity: 0.7;
}
</style>
