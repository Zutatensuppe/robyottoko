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
    <ResponsiveImage
      v-if="val.url"
      :src="val.url"
      width="64px"
      height="64px"
    />

    <UploadInput
      v-show="!val.url"
      ref="uploadComponent"
      accept="image/*"
      label=""
      class="avatar-animation-frame-upload"
      @uploaded="onUploaded"
    />
    <IntegerInput
      v-model="val.duration"
      @update:model-value="onDurationChange"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, Ref, ref, watch } from 'vue'
import { AvatarModuleAnimationFrameDefinition } from '../../../mod/modules/AvatarModuleCommon'
import type { UploadedFile } from '../../../types'
import { getFileFromDropEvent } from '../../util'
import UploadInput from '../UploadInput.vue'
import IntegerInput from '../IntegerInput.vue'
import ResponsiveImage from '../ResponsiveImage.vue'

const props = defineProps<{
  modelValue: AvatarModuleAnimationFrameDefinition
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: AvatarModuleAnimationFrameDefinition): void,
  (e: 'remove'): void,
}>()

const val = ref<AvatarModuleAnimationFrameDefinition>(JSON.parse(JSON.stringify(props.modelValue)))
const currentValJson = computed(() => JSON.stringify(val.value))

const draggingOver = ref<boolean>(false)
const uploadComponent = ref<InstanceType<typeof UploadInput>>() as Ref<InstanceType<typeof UploadInput>>

const emitUpdate = () => {
  emit('update:modelValue', val.value)
}
const onDurationChange = () => {
  emitUpdate()
}
const onRemove = () => {
  emit('remove')
}
const onUploaded = (file: UploadedFile) => {
  val.value = { url: file.urlpath, duration: 100 }
  emitUpdate()
}
const onDrop = (e: any) => {
  draggingOver.value = false
  e.preventDefault()
  e.stopPropagation()

  const file = getFileFromDropEvent(e)
  if (file) {
    val.value.url = ''
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

watch(() => props.modelValue, (value: AvatarModuleAnimationFrameDefinition) => {
  if (currentValJson.value !== JSON.stringify(value)) {
    val.value = value
  }
})
</script>
