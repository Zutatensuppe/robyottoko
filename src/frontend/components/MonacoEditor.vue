<template>
  <div
    ref="customCssEditor"
    class="monaco-holder"
  />
</template>
<script setup lang="ts">

import loader from '@monaco-editor/loader'
import { onMounted, onBeforeUnmount, ref, Ref, nextTick, watch } from 'vue';
loader.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.34.1/min/vs' } }) // or local

const customCssEditor = ref<HTMLDivElement>() as Ref<HTMLDivElement>

let editor: any = null

const props = defineProps<{
  modelValue: string,
  language: string,
}>()

const val = ref<string>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

watch(() => props.modelValue, (value: string) => {
  val.value = value
})

watch(val, (value: string) => {
  emit('update:modelValue', value)
}, { deep: true })

onMounted(async () => {
  let monaco = await loader.init()
  nextTick(() => {
    editor = monaco.editor.create(customCssEditor.value, {
      value: val.value,
      language: props.language,
      minimap: {
        enabled: false,
      },
    });
    editor.onDidChangeModelContent((_evt: any) => {
      val.value = editor.getValue()
    })
  })
})

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose()
  }
})
</script>
<style>
.monaco-holder {
  width: 100%;
  min-width: 500px;
  min-height: 800px;
}
</style>
