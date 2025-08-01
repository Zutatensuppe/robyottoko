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
import type { SetChannelTitleEffectData } from '../../../../types'
import { ref, watch } from 'vue'
import MacroSelect from '../../MacroSelect.vue'

const props = defineProps<{
  modelValue: SetChannelTitleEffectData,
}>()

const val = ref<SetChannelTitleEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: SetChannelTitleEffectData): void
}>()

watch(val, (newValue: SetChannelTitleEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
