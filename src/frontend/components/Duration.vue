<template>
  <span v-if="tag === 'span'">{{ humanReadable }}</span
  ><code v-else>{{ humanReadable }}</code>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import fn from "../../common/fn";

export default defineComponent({
  props: {
    value: {
      required: true,
    },
  },
  computed: {
    tag() {
      try {
        fn.mustParseHumanDuration(`${this.value}`);
        return "span";
      } catch (e) {
        return "code";
      }
    },
    humanReadable() {
      try {
        return fn.humanDuration(fn.mustParseHumanDuration(`${this.value}`));
      } catch (e) {
        return this.value;
      }
    },
  },
});
</script>
