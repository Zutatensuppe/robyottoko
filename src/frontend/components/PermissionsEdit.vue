<template>
  <div>
    <div class="field">
      <label>
        <input
          type="checkbox"
          v-model="val.active"
        />
        Restrict usage
      </label>
    </div>
    <div v-if="val.active">
      <label
        v-for="(perm, idx) in possiblePermissions"
        :key="idx"
        class="mr-1"
      >
        <input
          v-model="val.to"
          type="checkbox"
          :value="perm.value"
        >
        {{ perm.label }}
      </label>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { CommandRestrict, permissions } from '../../common/permissions'
import CheckboxInput from './CheckboxInput.vue'

const props = defineProps<{
  modelValue: CommandRestrict,
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: CommandRestrict): void,
}>()

interface ComponentDataPermission {
  value: string;
  label: string;
}

const val = ref<CommandRestrict>(props.modelValue)

const possiblePermissions = ref<ComponentDataPermission[]>(permissions)

watch(() => props.modelValue, (value: CommandRestrict) => {
  val.value = value
})

watch(val, (value: CommandRestrict) => {
  emit('update:modelValue', value)
}, { deep: true })
</script>
