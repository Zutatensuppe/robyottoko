<template>
  <tr>
    <td>
      Stream category:
      <div>
        <input
          v-model="val.data.game_id"
          class="input is-small spaceinput mb-1"
        >
        <span
          class="button is-small mr-1"
          @click="val.data.game_id = ''"
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
import { SetChannelGameIdEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: SetChannelGameIdEffect,
}>()

const val = ref<SetChannelGameIdEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue', 'removeClick'])

watch(val, (newValue: SetChannelGameIdEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
