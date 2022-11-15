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
import { AddStreamTagEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: AddStreamTagEffect,
}>()

const val = ref<AddStreamTagEffect>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: AddStreamTagEffect): void
}>()

watch(val, (newValue: AddStreamTagEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
