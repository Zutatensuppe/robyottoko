<template>
  <div
    class="avatar-slot-item-state-editor card"
    :class="{ 'dragging-over': draggingOver }"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="avatar-slot-item-state-editor-title">
      {{ val.state }}
    </div>
    <AvatarAnimation
      v-if="val.frames.length"
      :frames="val.frames"
    />
    <AvatarAnimation
      v-else
      :frames="defaultState.frames"
      class="avatar-fallback-animation"
    />
    <div>
      <div
        v-for="(_frame, idx) in val.frames"
        :key="idx"
        class="avatar-animation-card mr-2"
      >
        <AvatarFrameUpload
          :model-value="val.frames[idx]"
          @update:model-value="frameChanged(idx, $event)"
          @remove="frameRemoved(idx)"
        />
      </div>

      <div class="avatar-animation-card mr-1">
        <span class="avatar-animation-frame">
          <span
            class="button is-small"
            @click="addFrame"
          ><i class="fa fa-plus" /></span>
        </span>
      </div>
    </div>

    <UploadInput
      v-show="false"
      ref="uploadComponent"
      accept="image/*"
      label=""
      @uploaded="onUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, Ref, ref, watch } from 'vue'
import {
  AvatarModuleSlotItemStateDefinition,
  AvatarModuleAnimationFrameDefinition,
} from '../../../mod/modules/AvatarModuleCommon'
import { getFileFromDropEvent } from '../../util'
import type { UploadedFile } from '../../../types'
import AvatarAnimation from './AvatarAnimation.vue'
import AvatarFrameUpload from './AvatarFrameUpload.vue'
import UploadInput from '../UploadInput.vue'

const props = defineProps<{
  modelValue: AvatarModuleSlotItemStateDefinition
  defaultState: AvatarModuleSlotItemStateDefinition
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: AvatarModuleSlotItemStateDefinition): void
}>()

const val = ref<AvatarModuleSlotItemStateDefinition>(JSON.parse(JSON.stringify(props.modelValue)))
const currentValJson = computed(() => JSON.stringify(val.value))

const draggingOver = ref<boolean>(false)
const uploadComponent = ref<InstanceType<typeof UploadInput>>() as Ref<InstanceType<typeof UploadInput>>

const onDragOver = (e: DragEvent) => {
  draggingOver.value = true
  e.preventDefault()
  e.stopPropagation()
  return false
}
const onDragLeave = (e: DragEvent): void => {
  draggingOver.value = false
  e.preventDefault()
  e.stopPropagation()
}
const onDragEnter = (e: DragEvent): void => {
  if (!e.dataTransfer) {
    return
  }
  if (e.dataTransfer.getData('avatar-image-url')) {
    e.preventDefault()
  }
}
const onDrop = (e: DragEvent): void => {
  if (!e.dataTransfer) {
    return
  }
  draggingOver.value = false
  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer.getData('avatar-image-url')) {
    const frame: AvatarModuleAnimationFrameDefinition = {
      url: e.dataTransfer.getData('avatar-image-url'),
      duration: 100,
    }
    val.value.frames.push(frame)
  } else {
    const file = getFileFromDropEvent(e)
    if (file) {
      uploadComponent.value.uploadFile(file)
    }
  }
}
const onUploaded = (file: UploadedFile): void => {
  val.value.frames.push({
    url: file.urlpath,
    duration: 100,
  })
}

const frameChanged = (idx: number, frame: AvatarModuleAnimationFrameDefinition) => {
  val.value.frames[idx] = frame
}
const frameRemoved = (idx: number) => {
  val.value.frames = val.value.frames.filter((_val, index: number) => index !== idx)
}
const addFrame = () => {
  const frame: AvatarModuleAnimationFrameDefinition = {
    url: '',
    duration: 100,
  }
  val.value.frames.push(frame)
}

watch(() => props.modelValue, (value: AvatarModuleSlotItemStateDefinition) => {
  if (currentValJson.value !== JSON.stringify(value)) {
    val.value = value
  }
})

watch(val, (value: AvatarModuleSlotItemStateDefinition) => {
  emit('update:modelValue', value)
}, { deep: true })
</script>
