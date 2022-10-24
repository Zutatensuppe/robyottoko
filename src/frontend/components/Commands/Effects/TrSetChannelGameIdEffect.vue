<template>
  <div>
    <table>
      <tr>
        <td>
          <input
            v-model="val.data.game_id"
            placeholder="Add the stream category here"
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
import { SetChannelGameIdEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: SetChannelGameIdEffect,
}>()

const val = ref<SetChannelGameIdEffect>(props.modelValue)

const insertMacro = (macro: {
  value: string;
  title: string;
}): void => {
  val.value.data.game_id += macro.value;
}

const emit = defineEmits(['update:modelValue'])

watch(val, (newValue: SetChannelGameIdEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
