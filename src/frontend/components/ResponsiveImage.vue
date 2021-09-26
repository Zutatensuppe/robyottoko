<template>
  <div class="responsive-image" :style="style" :title="title"></div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "responsive-image",
  props: {
    src: String,
    title: String,
    height: {
      type: String,
      default: "100%",
    },
    width: {
      type: String,
      default: "100%",
    },
  },
  computed: {
    style() {
      return {
        display: "inline-block",
        verticalAlign: "text-bottom",
        backgroundImage: `url(/uploads/${encodeURIComponent(this.src)})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        backgroundPosition: "center",
        width: this.width,
        height: this.height,
      };
    },
  },
});
</script>
