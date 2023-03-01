<template>
  <div
    class="sound-upload"
    :class="{ 'dragging-over': draggingOver }"
    @drop="onDrop"
    @dragover="onDragover"
    @dragleave="onDragleave"
  >
    <AudioPlayer
      v-if="value.file"
      :src="value.urlpath"
      :name="value.filename"
      :volume="value.volume"
      :base-volume="baseVolume"
      class="button is-small"
    />
    <VolumeSlider
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
    <UploadInput
      ref="uploadComponent"
      accept="audio/*"
      label="Upload Sound"
      :class="{ 'mt-1': value.file }"
      @uploaded="onUploaded"
    />
  </div>
</template>
<script setup lang="ts">
import { getFileFromDropEvent } from '../util'
import { Ref, ref } from 'vue'
import { SoundMediaFile, UploadedFile } from '../../types'
import { soundMediaFileFromUploadedFile } from '../../common/fn'
import AudioPlayer from './AudioPlayer.vue'
import UploadInput from './UploadInput.vue'
import VolumeSlider from './VolumeSlider.vue'

const props = withDefaults(defineProps<{
  modelValue: SoundMediaFile | null
  baseVolume?: number
}>(), {
  baseVolume: 100,
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: SoundMediaFile): void
}>()

const value = ref<SoundMediaFile>(
  props.modelValue
    ? JSON.parse(JSON.stringify(props.modelValue))
    : { file: '', filename: '', urlpath: '', volume: 100 },
)
const draggingOver = ref<boolean>(false)

const uploadComponent = ref<InstanceType<typeof UploadInput>>() as Ref<InstanceType<typeof UploadInput>>

const emitUpdate = () => {
  emit('update:modelValue', JSON.parse(JSON.stringify(value.value)))
}

const onRemove = () => {
  value.value = { file: '', filename: '', urlpath: '', volume: 100 }
  emitUpdate()
}

const onUploaded = (file: UploadedFile) => {
  value.value = soundMediaFileFromUploadedFile(file)
  emitUpdate()
}

const onDrop = (e: any) => {
  draggingOver.value = false
  e.preventDefault()
  e.stopPropagation()

  const file = getFileFromDropEvent(e)
  if (file) {
    value.value.file = ''
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
.sound-upload {
  border: dashed 2px transparent;
}

.sound-upload.dragging-over {
  border: dashed 2px #444;
}
</style>
