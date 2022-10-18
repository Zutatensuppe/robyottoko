<template>
  <tr>
    <td>
      Countdown:
      <countdown-editor
        v-model="val.data"
        :base-volume="baseVolume"
      />
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
import { ref, watch } from 'vue';
import { CountdownEffect } from '../../../../types';

const props = defineProps<{
  modelValue: CountdownEffect,
  baseVolume: number,
}>()

const val = ref<CountdownEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue', 'removeClick'])

watch(val, (newValue: CountdownEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
