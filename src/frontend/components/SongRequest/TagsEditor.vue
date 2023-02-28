<template>
  <table class="table is-striped">
    <tr>
      <th>Tag</th>
      <th />
      <th />
    </tr>
    <tr
      v-for="(tag, idx) in tags"
      :key="idx"
    >
      <td>
        <input
          v-if="tagEditIdx === idx"
          v-model="editTag"
          type="text"
          class="input is-small"
          @keyup.enter="updateTag(tag.value, editTag)"
        >
        <input
          v-else
          type="text"
          class="input is-small"
          :value="tag.value"
          @focus="onInputFocus(tag, idx)"
        >
      </td>
      <td>
        <span
          v-if="tagEditIdx === idx"
          class="button is-small"
          :disabled="tag.value === editTag ? true : undefined"
          @click="updateTag(tag.value, editTag)"
        >Save</span>
      </td>
      <td>{{ tag.count }}x</td>
    </tr>
  </table>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { TagInfo } from '../../../mod/modules/SongrequestModuleCommon'

const editTag = ref<string>('')
const tagEditIdx = ref<number>(-1)

defineProps<{
  tags: TagInfo[]
}>()

const emit = defineEmits<{
  (e: 'updateTag', val: [string, string]): void
}>()

const onInputFocus = (tag: TagInfo, idx: number) => {
  editTag.value = tag.value
  tagEditIdx.value = idx
}

const updateTag = (oldTag: string, newTag: string) => {
  emit('updateTag', [oldTag, newTag])
}
</script>
