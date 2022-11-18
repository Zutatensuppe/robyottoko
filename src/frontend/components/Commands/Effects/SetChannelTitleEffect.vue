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
        <td>
          <MacroSelect
            class="help"
            @selected="val.data.title += $event.value;"
          />
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import { SetChannelTitleEffect } from '../../../../types';
import { ref, watch } from 'vue';
import MacroSelect from '../../MacroSelect.vue'

const props = defineProps<{
  modelValue: SetChannelTitleEffect,
}>()

const val = ref<SetChannelTitleEffect>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: SetChannelTitleEffect): void
}>()

watch(val, (newValue: SetChannelTitleEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
