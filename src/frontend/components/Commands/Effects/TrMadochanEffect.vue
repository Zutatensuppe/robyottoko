<template>
  <tr>
    <td>
      <div>
        Model:
        <div class="control">
          <input
            v-model="val.data.model"
            class="input is-small spaceinput"
          >
        </div>
        <div class="help">
          For possible values refer to
          <a
            href="https://madochan.hyottoko.club/"
            target="_blank"
          >madochan</a>
        </div>
      </div>
      <div>
        Weirdness:
        <div class="control">
          <input
            v-model="val.data.weirdness"
            class="input is-small spaceinput"
          >
        </div>
        <div class="help">
          For possible values refer to
          <a
            href="https://madochan.hyottoko.club/"
            target="_blank"
          >madochan</a>
        </div>
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
import { MadochanEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: MadochanEffect,
}>()

const val = ref<MadochanEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue', 'removeClick'])

watch(val, (newValue: MadochanEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
