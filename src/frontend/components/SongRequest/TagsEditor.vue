<template>
  <table class="table is-striped">
    <tr>
      <th>Tag</th>
      <th></th>
      <th></th>
    </tr>
    <tr v-for="(tag, idx) in tags" :key="idx">
      <td>
        <input
          v-if="tagEditIdx === idx"
          type="text"
          class="input is-small"
          v-model="editTag"
          @keyup.enter="updateTag(tag.value, editTag)"
        />
        <input
          v-else
          type="text"
          class="input is-small"
          :value="tag.value"
          @focus="onInputFocus(tag, idx)"
        />
      </td>
      <td>
        <span
          class="button is-small"
          v-if="tagEditIdx === idx"
          :disabled="tag.value === editTag ? true : null"
          @click="updateTag(tag.value, editTag)"
          >Save</span
        >
      </td>
      <td>{{ tag.count }}x</td>
    </tr>
  </table>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    tags: Array,
  },
  data: () => ({
    editTag: "",
    tagEditIdx: -1,
  }),
  methods: {
    onInputFocus(tag, idx: number) {
      this.editTag = tag.value;
      this.tagEditIdx = idx;
    },
    updateTag(oldTag: string, newTag: string) {
      this.$emit("updateTag", [oldTag, newTag]);
    },
  },
});
</script>
