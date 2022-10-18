<template>
  <tr>
    <td>
      Tag to remove:
      <div>
        <input
          v-model="val.data.tag"
          class="input is-small spaceinput mb-1"
        >
        <span
          class="button is-small mr-1"
          @click="val.data.tag = ''"
        >All args</span>
      </div>

      <button
        class="button is-small"
        @click="emit('removeClick')"
      >
        <i class="fa fa-remove" />
      </button>
    </td>
  </tr>
</template>
<script setup lang="ts">
import { RemoveStreamTagEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: RemoveStreamTagEffect,
}>()

const val = ref<RemoveStreamTagEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue', 'removeClick'])

watch(val, (newValue: RemoveStreamTagEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
