<template>
  <input class="input is-small spaceinput" :class="classes" v-model="v" />
</template>
<script lang="ts">
import { defineComponent } from "vue";
import fn from "../../common/fn";

export default defineComponent({
  props: {
    modelValue: {
      required: true,
    },
  },
  emits: ["update:modelValue"],
  data: () => ({
    v: "",
    valid: true,
  }),
  computed: {
    classes() {
      if (this.valid) {
        return [];
      }
      return ["has-background-danger-light", "has-text-danger-dark"];
    },
  },
  mounted() {
    this.v = `${this.modelValue}`;
  },
  watch: {
    v: {
      handler(v) {
        try {
          const r = fn.doDummyReplacements(v, "0");
          fn.mustParseHumanDuration(r);
          this.valid = true;
        } catch (e) {
          this.valid = false;
        }
        this.$emit("update:modelValue", v);
      },
    },
    modelValue: {
      handler(v) {
        this.v = `${v}`;
      },
    },
  },
});
</script>
