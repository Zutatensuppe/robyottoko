<template>
  <span
    class="avatar-animation-frame"
    :class="{ 'dragging-over': draggingOver }"
    @drop="onDrop"
    @dragover="onDragover"
    @dragleave="onDragleave"
  >
    <div class="avatar-animation-frame-remove">
      <span
        class="button is-small"
        @click="onRemove"
      >
        <i class="fa fa-trash" />
      </span>
    </div>
    <img
      v-if="value.url"
      :src="value.url"
      width="64"
      height="64"
    >

    <UploadInput
      v-show="!value.url"
      ref="uploadComponent"
      accept="image/*"
      label=""
      class="avatar-animation-frame-upload"
      @uploaded="onUploaded"
    />
    <IntegerInput
      v-model="value.duration"
      @update:modelValue="onDurationChange"
    />
  </span>
</template>

<script setup lang="ts">
import { onMounted, Ref, ref, watch } from "vue";
import { AvatarModuleAnimationFrameDefinition } from "../../../mod/modules/AvatarModuleCommon";
import { UploadedFile } from "../../../types";
import { getFileFromDropEvent } from "../../util";
import UploadInput from "../UploadInput.vue";
import IntegerInput from "../IntegerInput.vue";

const props = defineProps<{
  modelValue: AvatarModuleAnimationFrameDefinition | null
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', val: AvatarModuleAnimationFrameDefinition): void
}>()

const value = ref<AvatarModuleAnimationFrameDefinition>({
  url: "",
  duration: 100,
})
const draggingOver = ref<boolean>(false)
const uploadComponent = ref<InstanceType<typeof UploadInput>>() as Ref<InstanceType<typeof UploadInput>>

const applyValue = () => {
  value.value = props.modelValue !== null
    ? JSON.parse(JSON.stringify(props.modelValue))
    : { url: "", duration: 100 }
}
const emitUpdate = () => {
  emit("update:modelValue", JSON.parse(JSON.stringify(value.value)))
}
const onDurationChange = () => {
  emit("update:modelValue", JSON.parse(JSON.stringify(value.value)))
}
const onRemove = () => {
  value.value = { url: "", duration: 100 }
  emitUpdate()
}
const onUploaded = (file: UploadedFile) => {
  value.value = { url: file.urlpath, duration: 100 }
  emitUpdate()
}
const onDrop = (e: any) => {
  draggingOver.value = false;
  e.preventDefault();
  e.stopPropagation();

  const file = getFileFromDropEvent(e)
  if (file) {
    value.value.url = "";
    uploadComponent.value.uploadFile(file);
  }
  return false;
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

onMounted(() => {
  watch(() => props.modelValue, () => {
    applyValue();
  })
  applyValue();
})
</script>
<style scoped>
.avatar-animation-frame {
  border: dashed 2px transparent;
}

.avatar-animation-frame.dragging-over {
  border: dashed 2px #444;
}
</style>
