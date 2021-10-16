<template>
  <textarea
    class="textarea"
    v-model="value"
    @update:modelValue="valChange"
  ></textarea>
</template>

<script>
import { defineComponent } from "@vue/runtime-core";

export default defineComponent({
  props: {
    modelValue: {
      type: String,
      required: true,
    },
  },
  data: () => ({
    value: "",
  }),
  methods: {
    valChange() {
      this.$emit("update:modelValue", this.value);
    },
  },
  created() {
    this.value = this.modelValue;
  },
});
</script>
