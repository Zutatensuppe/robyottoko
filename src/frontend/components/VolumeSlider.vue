<template>
  <slider
    class="volume-slider"
    iconLeft="fa-volume-down"
    iconRight="fa-volume-up"
    :min="0"
    :max="100"
    v-model="volume"
    @update:modelValue="valChange"
  />
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "volume-slider",
  props: {
    modelValue: {
      required: true,
    },
  },
  emits: ["update:modelValue"],
  data: () => ({
    volume: 100,
  }),
  methods: {
    valChange() {
      this.$emit("update:modelValue", parseInt(`${this.volume}`, 10));
    },
  },
  created() {
    this.volume = parseInt(`${this.modelValue}`, 10);
  },
});
</script>
