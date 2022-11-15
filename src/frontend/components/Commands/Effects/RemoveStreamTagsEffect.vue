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
          <macro-select
            class="help"
            @selected="val.data.tag += $event.value"
          />
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

const emit = defineEmits<{
  (e: 'update:modelValue', val: RemoveStreamTagEffect): void
}>()

watch(val, (newValue: RemoveStreamTagEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
