<template>
  <label class="upload">
    <input
      type="file"
      :disabled="uploading"
      style="display: none"
      :accept="accept"
      @change="upload"
    >
    <span class="button is-small"><i
      class="fa fa-upload"
      :class="{ 'mr-1': buttonText }"
    />{{
      buttonText
    }}</span>
    <span
      class="progress"
      :style="progressStyle"
    />
  </label>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UploadedFile } from '../../types'
import api from '../api'

const props = withDefaults(defineProps<{
  accept: string
  label?: string
}>(), {
  label: 'Upload File',
})

const emit = defineEmits<{
  (e: 'uploaded', val: UploadedFile): void
}>()

const uploading = ref<boolean>(false)
const progress = ref<number>(0)

const uploadPercent = computed(() => {
  return Math.round(progress.value * 100)
})
const buttonText = computed(() => {
  if (!uploading.value) {
    return props.label ? ` ${props.label}` : ''
  }
  return ` Uploading (${uploadPercent.value}%)`
})
const progressStyle = computed(() => {
  if (!uploading.value) {
    return {}
  }
  const p = uploadPercent.value
  const c = 'rgba(0,255,0, .5)'
  return {
    background: `linear-gradient(90deg, ${c} 0%, ${c} ${p}%, transparent ${p}%)`,
  }
})


const uploadFile = async (file: File) => {
  uploading.value = true
  const res = await api.upload(file, (progressEvt) => {
    progress.value = progressEvt.loaded / progressEvt.total
  })
  uploading.value = false
  const uploadedFile: UploadedFile = await res.json()
  emit('uploaded', uploadedFile)
}
const upload = async (evt: Event) => {
  const input = evt.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    return
  }
  uploadFile(input.files[0])
}

defineExpose({
  uploadFile,
})
</script>

<style lang="scss" scoped>
@import "../vars.scss";

.upload {
  position: relative;
  display: inline-block;
  vertical-align: text-bottom;
}

.upload .progress {
  height: 2px;
  position: absolute;
  bottom: 1px;
  left: 1px;
  right: 1px;
  display: block;
  border-radius: 0 0 $radius $radius;
}
</style>
