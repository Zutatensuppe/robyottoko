<template>
  <div>
    <table>
      <tr>
        <td>
          <input
            v-model="val.data.title"
            placeholder="Add the stream title here"
            class="input is-small spaceinput mb-1"
          >
        </td>
        <td class="help">
          <macro-select @selected="insertMacro($event)" />
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import { SetChannelTitleEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: SetChannelTitleEffect,
}>()

const val = ref<SetChannelTitleEffect>(props.modelValue)

const insertMacro = (macro: {
  value: string;
  title: string;
}): void => {
  val.value.data.title += macro.value;
}

const emit = defineEmits(['update:modelValue'])

watch(val, (newValue: SetChannelTitleEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
