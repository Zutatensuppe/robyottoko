<template>
  <input type="checkbox" v-model="value" @update:modelValue="emitUpdate" />
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<any>,
      required: true,
    },
    onValue: {
      type: Object as PropType<any>,
      default: true,
    },
    offValue: {
      type: Object as PropType<any>,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  data() {
    return {
      value: false,
    };
  },
  created() {
    this.value = this.modelValue === this.onValue;
  },
  methods: {
    emitUpdate() {
      this.$emit(
        "update:modelValue",
        this.value ? this.onValue : this.offValue
      );
    },
  },
});
</script>
