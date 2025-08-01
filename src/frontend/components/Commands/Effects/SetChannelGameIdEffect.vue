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
        <td>
          <MacroSelect
            class="help"
            @selected="val.data.game_id += $event.value"
          />
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import type { SetChannelGameIdEffectData } from '../../../../types'
import { ref, watch } from 'vue'
import MacroSelect from '../../MacroSelect.vue'

const props = defineProps<{
  modelValue: SetChannelGameIdEffectData,
}>()

const val = ref<SetChannelGameIdEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: SetChannelGameIdEffectData): void
}>()

watch(val, (newValue: SetChannelGameIdEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
