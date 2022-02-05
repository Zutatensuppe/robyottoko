<template>
  <span
    @drop="onDrop"
    @dragover="onDragover"
    @dragleave="onDragleave"
    class="avatar-animation-frame"
    :class="{ 'dragging-over': draggingOver }"
  >
    <div class="avatar-animation-frame-remove">
      <span class="button is-small" @click="onRemove">
        <i class="fa fa-trash"></i>
      </span>
    </div>
    <img v-if="value.url" :src="value.url" width="64" height="64" />

    <upload
      v-show="!value.url"
      @uploaded="onUploaded"
      accept="image/*"
      label=""
      class="avatar-animation-frame-upload"
      ref="uploadComponent"
    />
    <input
      class="input is-small"
      type="text"
      v-model="value.duration"
      @update:modelValue="onDurationChange"
    />
  </span>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { AvatarModuleAnimationFrameDefinition } from "../../../mod/modules/AvatarModuleCommon";
import { UploadedFile } from "../../../types";

interface ComponentData {
  value: AvatarModuleAnimationFrameDefinition;
  draggingOver: boolean;
}

export default defineComponent({
  props: {
    modelValue: {
      /* type: Object as PropType<MediaFile | null>, */ required: true,
    },
  },
  emits: ["update:modelValue"],
  data(): ComponentData {
    return {
      value: {
        url: "",
        duration: 100,
      },
      draggingOver: false,
    };
  },
  created() {
    if (this.modelValue !== null) {
      this.value = JSON.parse(JSON.stringify(this.modelValue));
    }
  },
  methods: {
    emitUpdate() {
      this.$emit("update:modelValue", JSON.parse(JSON.stringify(this.value)));
    },
    onDurationChange() {
      this.$emit("update:modelValue", JSON.parse(JSON.stringify(this.value)));
    },
    onRemove() {
      this.value = { url: "", duration: 100 };
      this.emitUpdate();
    },
    onUploaded(file: UploadedFile) {
      this.value = { url: file.urlpath, duration: 100 };
      this.emitUpdate();
    },
    onDrop(e: any) {
      this.draggingOver = false;
      e.preventDefault();
      e.stopPropagation();

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
        this.value.url = "";
        this.$refs.uploadComponent.uploadFile(file);
      }
      return false;
    },
    onDragover(e: any) {
      this.draggingOver = true;
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    onDragleave(e: any) {
      this.draggingOver = false;
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
  },
});
</script>
<style scoped>
.avatar-animation-frame {
  border: dashed 2px transparent;
}
.avatar-animation-frame.dragging-over {
  border: dashed 2px #444;
}
</style>
