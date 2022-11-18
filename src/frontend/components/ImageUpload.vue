<template>
  <div
    class="image-upload"
    :class="{ 'dragging-over': draggingOver }"
    @drop="onDrop"
    @dragover="onDragover"
    @dragleave="onDragleave"
  >
    <ResponsiveImage
      v-if="value.file"
      :src="value.urlpath"
      :title="value.filename"
      :width="width"
      :height="height"
      style="display: block"
    />
    <button
      v-if="value.file"
      class="button is-small"
      @click="onRemove"
    >
      <i class="fa fa-remove mr-1" /> Remove
    </button>
    <br v-if="value.file">
    <UploadInput
      ref="uploadComponent"
      accept="image/*"
      label="Upload Image"
      :class="{ 'mt-1': value.file }"
      @uploaded="onUploaded"
    />
  </div>
</template>
<script setup lang="ts">
import { Ref, ref } from "vue";
import { mediaFileFromUploadedFile } from "../../common/fn";
import { MediaFile, UploadedFile } from "../../types";
import { getFileFromDropEvent } from "../util";
import UploadInput, { UploadInstance } from "./UploadInput.vue";
import ResponsiveImage from './ResponsiveImage.vue'

const props = withDefaults(defineProps<{
  modelValue: MediaFile | null
  width?: string
  height?: string
}>(), {
  width: "100%",
  height: "90px",
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: MediaFile): void
}>()

const value = ref<MediaFile>(
  props.modelValue
    ? JSON.parse(JSON.stringify(props.modelValue))
    : { file: "", filename: "", urlpath: "" }
)
const draggingOver = ref<boolean>(false)

const uploadComponent = ref<UploadInstance>() as Ref<UploadInstance>

const emitUpdate = () => {
  emit("update:modelValue", JSON.parse(JSON.stringify(value.value)))
}

const onRemove = () => {
  value.value = { file: "", filename: "", urlpath: "" }
  emitUpdate()
}

const onUploaded = (file: UploadedFile) => {
  value.value = mediaFileFromUploadedFile(file)
  emitUpdate()
}

const onDrop = (e: any) => {
  draggingOver.value = false
  e.preventDefault()
  e.stopPropagation()

  const file = getFileFromDropEvent(e)
  if (file) {
    value.value.file = ""
    uploadComponent.value.uploadFile(file)
  }
  return false
}

const onDragover = (e: any) => {
  draggingOver.value = true
  e.preventDefault()
  e.stopPropagation()
  return false
}

const onDragleave = (e: any) => {
  draggingOver.value = false
  e.preventDefault()
  e.stopPropagation()
  return false
}
</script>
<style scoped>
.image-upload {
  border: dashed 2px transparent;
}

.image-upload.dragging-over {
  border: dashed 2px #444;
}
</style>
