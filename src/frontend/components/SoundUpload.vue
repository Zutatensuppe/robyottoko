<template>
  <div
    class="sound-upload"
    :class="{ 'dragging-over': draggingOver }"
    @drop="onDrop"
    @dragover="onDragover"
    @dragleave="onDragleave"
  >
    <audio-player
      v-if="value.file"
      :src="value.urlpath"
      :name="value.filename"
      :volume="value.volume"
      :base-volume="baseVolume"
      class="button is-small"
    />
    <volume-slider
      v-if="value.file"
      :model-value="value.volume"
      @update:modelValue="value.volume = $event; emitUpdate(); "
    />
    <button
      v-if="value.file"
      class="button is-small"
      @click="onRemove"
    >
      <i class="fa fa-remove mr-1" /> Remove
    </button>
    <br v-if="value.file">
    <upload-input
      ref="uploadComponent"
      accept="audio/*"
      label="Upload Sound"
      :class="{ 'mt-1': value.file }"
      @uploaded="onUploaded"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { soundMediaFileFromUploadedFile } from "../../common/fn";
import { SoundMediaFile, UploadedFile } from "../../types";
import { getFileFromDropEvent } from "../util";
import { UploadInstance } from "./UploadInput.vue";

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
  computed: {
    uploadComponent(): UploadInstance {
      return this.$refs.uploadComponent as UploadInstance
    },
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

      const file = getFileFromDropEvent(e)
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
