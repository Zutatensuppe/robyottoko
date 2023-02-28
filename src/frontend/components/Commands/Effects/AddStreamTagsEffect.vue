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
import { AddStreamTagEffectData } from '../../../../types'
import { ref, watch } from 'vue'
import MacroSelect from '../../MacroSelect.vue'

const props = defineProps<{
  modelValue: AddStreamTagEffectData,
}>()

const val = ref<AddStreamTagEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: AddStreamTagEffectData): void
}>()

watch(val, (newValue: AddStreamTagEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
