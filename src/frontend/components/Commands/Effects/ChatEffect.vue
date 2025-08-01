<template>
  <div>
    <div
      v-for="(txt, idx) in val.data.text"
      :key="idx"
      class="field textarea-holder"
    >
      <textarea
        v-model="val.data.text[idx]"
        class="textarea"
        :class="{
          'has-background-danger-light': !val.data.text[idx],
          'has-text-danger-dark': !val.data.text[idx],
        }"
      />
      <div>
        <MacroSelect
          class="help"
          @selected="val.data.text[idx] += $event.value"
        />
      </div>
      <button
        class="button is-small"
        :disabled="val.data.text.length <= 1"
        @click="rmtxt(idx)"
      >
        <i class="fa fa-remove" />
      </button>
    </div>
    <div class="field">
      <button
        class="button is-small"
        @click="addtxt"
      >
        <i class="fa fa-plus mr-1" /> Add response
      </button>
    </div>
    <div>
      <p class="help">
        If multiple responses exist, a random one will be used when
        the command is triggered.
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ChatEffectData } from '../../../../types'
import { ref, watch } from 'vue'
import { newText } from '../../../../common/commands'
import MacroSelect from '../../MacroSelect.vue'

const props = defineProps<{
  modelValue: ChatEffectData,
}>()

const val = ref<ChatEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: ChatEffectData): void
}>()

const addtxt = (): void => {
  val.value.data.text.push(newText())
}
const rmtxt = (idx: number): void => {
  val.value.data.text = val.value.data.text.filter((_val: string, index: number) => index !== idx)
}

watch(val, (newValue: ChatEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
<style scoped>
.textarea-holder {
  position: relative;
  padding-right: 2em;
}

.textarea-holder .button {
  position: absolute;
  right: -2px;
  top: 0;
}
</style>
