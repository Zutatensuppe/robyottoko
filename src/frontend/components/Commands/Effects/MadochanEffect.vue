<template>
  <div>
    <table>
      <tr>
        <td>Model:</td>
        <td>
          <input
            v-model="val.data.model"
            class="input is-small spaceinput"
          >
        </td>
        <td class="help">
          For possible values refer to
          <a
            href="https://madochan.hyottoko.club/"
            target="_blank"
          >madochan</a>
        </td>
      </tr>
      <tr>
        <td>Weirdness:</td>
        <td>
          <input
            v-model="val.data.weirdness"
            class="input is-small spaceinput"
          >
        </td>
        <td class="help">
          For possible values refer to
          <a
            href="https://madochan.hyottoko.club/"
            target="_blank"
          >madochan</a>
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import { MadochanEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: MadochanEffect,
}>()

const val = ref<MadochanEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue'])

watch(val, (newValue: MadochanEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
