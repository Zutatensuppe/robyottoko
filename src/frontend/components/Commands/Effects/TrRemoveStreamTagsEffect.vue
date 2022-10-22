<template>
  <div>
    <table>
      <tr>
        <td>
          <input
            v-model="val.data.tag"
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
import { RemoveStreamTagEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: RemoveStreamTagEffect,
}>()

const val = ref<RemoveStreamTagEffect>(props.modelValue)

const insertMacro = (macro: {
  value: string;
  title: string;
}): void => {
  val.value.data.tag += macro.value;
}

const emit = defineEmits(['update:modelValue'])

watch(val, (newValue: RemoveStreamTagEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
