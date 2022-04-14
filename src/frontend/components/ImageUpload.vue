<template>
  <div @drop="onDrop" @dragover="onDragover" @dragleave="onDragleave" class="image-upload"
    :class="{ 'dragging-over': draggingOver }">
    <responsive-image v-if="value.file" :src="value.urlpath" :title="value.filename" :width="width" :height="height"
      style="display: block" />
    <button v-if="value.file" class="button is-small" @click="onRemove">
      <i class="fa fa-remove mr-1" /> Remove
    </button>
    <br v-if="value.file" />
    <upload @uploaded="onUploaded" accept="image/*" label="Upload Image" :class="{ 'mt-1': value.file }"
      ref="uploadComponent" />
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mediaFileFromUploadedFile } from "../../common/fn";
import { MediaFile, UploadedFile } from "../../types";
import { UploadInstance } from "./Upload.vue";

interface ComponentData {
  value: MediaFile;
  draggingOver: boolean;
}

export default defineComponent({
  props: {
    modelValue: {
      /* type: Object as PropType<MediaFile | null>, */ required: true,
    },
    width: { type: String, required: false, default: "100%" },
    height: { type: String, required: false, default: "90px" },
  },
  emits: ["update:modelValue"],
  data(): ComponentData {
    return {
      value: {
        file: "",
        filename: "",
        urlpath: "",
      },
      draggingOver: false,
    };
  },
  created() {
    if (this.modelValue !== null) {
      this.value = JSON.parse(JSON.stringify(this.modelValue));
    }
  },
  computed: {
    uploadComponent(): UploadInstance {
      return this.$refs.uploadComponent as UploadInstance
    },
  },
  methods: {
    emitUpdate() {
      this.$emit("update:modelValue", JSON.parse(JSON.stringify(this.value)));
    },
    onRemove() {
      this.value = { file: "", filename: "", urlpath: "" };
      this.emitUpdate();
    },
    onUploaded(file: UploadedFile) {
      this.value = mediaFileFromUploadedFile(file);
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
        this.value.file = "";
        this.uploadComponent.uploadFile(file);
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
.image-upload {
  border: dashed 2px transparent;
}

.image-upload.dragging-over {
  border: dashed 2px #444;
}
</style>
