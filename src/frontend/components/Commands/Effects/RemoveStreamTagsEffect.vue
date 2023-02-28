<template>
  <div>
    <table>
      <tr>
        <td>
          <input
            v-model="val.data.tag"
            placeholder="Add a tag to remove here"
            class="input is-small spaceinput mb-1"
          >
        </td>
        <td>
          <MacroSelect
            class="help"
            @selected="val.data.tag += $event.value"
          />
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import { RemoveStreamTagEffectData } from '../../../../types'
import { ref, watch } from 'vue'
import MacroSelect from '../../MacroSelect.vue'

const props = defineProps<{
  modelValue: RemoveStreamTagEffectData,
}>()

const val = ref<RemoveStreamTagEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: RemoveStreamTagEffectData): void
}>()

watch(val, (newValue: RemoveStreamTagEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
