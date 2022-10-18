<template>
  <tr>
    <td>
      Chatters:
      <div>Outputs the people who chatted during the stream.</div>

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
import { ChattersEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: ChattersEffect,
}>()

const val = ref<ChattersEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue', 'removeClick'])

watch(val, (newValue: ChattersEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
