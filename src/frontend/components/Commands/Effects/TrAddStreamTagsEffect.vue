<template>
  <div>
    <table>
      <tr>
        <td>
          <input
            v-model="val.data.tag"
            placeholder="Add a tag to add here"
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
import { AddStreamTagEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: AddStreamTagEffect,
}>()

const val = ref<AddStreamTagEffect>(props.modelValue)

const insertMacro = (macro: {
  value: string;
  title: string;
}): void => {
  val.value.data.tag += macro.value;
}

const emit = defineEmits(['update:modelValue'])

watch(val, (newValue: AddStreamTagEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
