<template>
  <div @drop="onDrop" @dragover="onDragover" @dragleave="onDragleave" class="sound-upload"
    :class="{ 'dragging-over': draggingOver }">
    <player v-if="value.file" :src="value.urlpath" :name="value.filename" :volume="value.volume"
      :baseVolume="baseVolume" class="button is-small" />
    <volume-slider v-if="value.file" :modelValue="value.volume"
      @update:modelValue="value.volume = $event; emitUpdate(); " />
    <button v-if="value.file" class="button is-small" @click="onRemove">
      <i class="fa fa-remove mr-1" /> Remove
    </button>
    <br v-if="value.file" />
    <upload @uploaded="onUploaded" accept="audio/*" label="Upload Sound" :class="{ 'mt-1': value.file }"
      ref="uploadComponent" />
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { soundMediaFileFromUploadedFile } from "../../common/fn";
import { SoundMediaFile, UploadedFile } from "../../types";
import { UploadInstance } from "./Upload.vue";

interface ComponentData {
  value: SoundMediaFile;
  draggingOver: boolean;
}

export default defineComponent({
  props: {
    modelValue: {
      /* type: Object as PropType<SoundMediaFile | null>, */ required: true,
    },
    baseVolume: { default: 100 },
  },
  emits: ["update:modelValue"],
  data(): ComponentData {
    return {
      value: {
        file: "",
        filename: "",
        urlpath: "",
        volume: 100,
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
      this.value = { file: "", filename: "", urlpath: "", volume: 100 };
      this.emitUpdate();
    },
    onUploaded(file: UploadedFile) {
      this.value = soundMediaFileFromUploadedFile(file);
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
.sound-upload {
  border: dashed 2px transparent;
}

.sound-upload.dragging-over {
  border: dashed 2px #444;
}
</style>
