<template>
  <tr>
    <td>
      Stream title:
      <div>
        <input
          v-model="val.data.title"
          class="input is-small spaceinput mb-1"
        >
        <span
          class="button is-small mr-1"
          @click="val.data.title = ''"
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
import { SetChannelTitleEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: SetChannelTitleEffect,
}>()

const val = ref<SetChannelTitleEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue', 'removeClick'])

watch(val, (newValue: SetChannelTitleEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
