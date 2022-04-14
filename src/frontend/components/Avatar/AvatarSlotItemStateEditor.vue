<template>
  <div class="avatar-slot-item-state-editor card" :class="{ 'dragging-over': draggingOver }" @dragover="onDragOver"
    @dragenter="onDragEnter" @dragleave="onDragLeave" @drop="onDrop">
    <div class="avatar-slot-item-state-editor-title">
      {{ modelValue.state }}
    </div>
    <avatar-animation :frames="modelValue.frames" v-if="modelValue.frames.length" />
    <avatar-animation v-else :frames="defaultState.frames" class="avatar-fallback-animation" />
    <div>
      <div class="avatar-animation-card mr-1" v-for="(frame, idx) in modelValue.frames" :key="idx">
        <avatar-frame-upload :modelValue="frame" @update:modelValue="frameChanged(idx, $event)" />
      </div>

      <div class="avatar-animation-card mr-1">
        <span class="avatar-animation-frame">
          <span class="button is-small" @click="addFrame"><i class="fa fa-plus"></i></span>
        </span>
      </div>
    </div>

    <upload v-show="false" @uploaded="onUploaded" accept="image/*" label="" ref="uploadComponent" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import {
  AvatarModuleSlotItemStateDefinition,
  AvatarModuleAnimationFrameDefinition,
} from "../../../mod/modules/AvatarModuleCommon";
import { MediaFile } from "../../../types";
import { UploadInstance } from "../Upload.vue";

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
      draggingOver: false,
      editing: false,
    };
  },
  computed: {
    uploadComponent(): UploadInstance {
      return this.$refs.uploadComponent as UploadInstance
    },
  },
  methods: {
    onDragOver(e: DragEvent) {
      this.draggingOver = true;
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    onDragLeave(e: DragEvent) {
      this.draggingOver = false;
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    onDragEnter(e: DragEvent) {
      if (e.dataTransfer.getData("avatar-image-url")) {
        e.preventDefault();
      }
    },
    onDrop(e: DragEvent) {
      this.draggingOver = false;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.getData("avatar-image-url")) {
        const frame: AvatarModuleAnimationFrameDefinition = {
          url: e.dataTransfer.getData("avatar-image-url"),
          duration: 100,
        };
        this.modelValue.frames.push(frame);
      } else {
        let file = null;
        if (e.dataTransfer.items) {
          // Use DataTransferItemList interface to access the file(s)
          for (var i = 0; i < e.dataTransfer.items.length; i++) {
            // If dropped items aren't files, reject them
            if (e.dataTransfer.items[i].kind === "file") {
              file = e.dataTransfer.items[i].getAsFile();
              break;
            }
          }
        } else {
          // Use DataTransfer interface to access the file(s)
          for (var i = 0; i < e.dataTransfer.files.length; i++) {
            file = e.dataTransfer.files[i];
            break;
          }
        }
        if (file) {
          this.uploadComponent.uploadFile(file);
        }
      }
      return false;
    },
    onUploaded(file: MediaFile) {
      this.modelValue.frames.push({
        url: file.urlpath,
        duration: 100,
      });
    },
    onOverlayClick() {
      this.editing = false;
    },
    frameChanged(idx: number, frame: AvatarModuleAnimationFrameDefinition) {
      if (frame.url === "") {
        this.modelValue.frames = this.modelValue.frames.filter(
          (_val, index: number) => index !== idx
        );
      } else {
        this.modelValue.frames[idx] = frame;
      }
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

.avatar-slot-item-state-editor.dragging-over {
  border-style: dashed;
  border-color: #444;
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
  display: flex;
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
