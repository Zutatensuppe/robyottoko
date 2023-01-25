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
import { MadochanEffectData } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: MadochanEffectData,
}>()

const val = ref<MadochanEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: MadochanEffectData): void
}>()

watch(val, (newValue: MadochanEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
