<template>
  <span @drop="onDrop" @dragover="onDragover" @dragleave="onDragleave" class="avatar-animation-frame"
    :class="{ 'dragging-over': draggingOver }">
    <div class="avatar-animation-frame-remove">
      <span class="button is-small" @click="onRemove">
        <i class="fa fa-trash"></i>
      </span>
    </div>
    <img v-if="value.url" :src="value.url" width="64" height="64" />

    <upload v-show="!value.url" @uploaded="onUploaded" accept="image/*" label="" class="avatar-animation-frame-upload"
      ref="uploadComponent" />
    <input class="input is-small" type="text" v-model="value.duration" @update:modelValue="onDurationChange" />
  </span>
</template>

<script setup lang="ts">
import { onMounted, Ref, ref, watch } from "vue";
import { AvatarModuleAnimationFrameDefinition } from "../../../mod/modules/AvatarModuleCommon";
import { UploadedFile } from "../../../types";
import { UploadInstance } from "../Upload.vue";

const props = defineProps({
  modelValue: { /* type: Object as PropType<MediaFile | null>, */ required: true },
})
const emit = defineEmits(["update:modelValue"])

const value = ref<AvatarModuleAnimationFrameDefinition>({
  url: "",
  duration: 100,
})
const draggingOver = ref<boolean>(false)
const uploadComponent = ref<UploadInstance>() as Ref<UploadInstance>

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
