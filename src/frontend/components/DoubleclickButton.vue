<template>
  <button class="doubleclick-button" @click="onClick">
    <slot />
    <span
      class="doubleclick-button-message mr-2 p-1 has-text-danger"
      v-if="timer"
    >
      {{ message }}
      <span
        class="doubleclick-button-timout-indicator"
        :style="indicatorStyle"
      ></span>
    </span>
  </button>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  emits: ["click", "doubleclick"],
  props: {
    message: {
      type: String,
      required: true,
    },
    timeout: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      time: null,
      timer: null,
    };
  },
  computed: {
    indicatorStyle() {
      if (this.timer === null) {
        return {};
      }
      return {
        width: `${(this.time / this.timeout) * 100}%`,
      };
    },
  },
  methods: {
    onClick(evt) {
      if (this.timer === null) {
        this.$emit("click");
        this.time = this.timeout;
        this.timer = setInterval(() => {
          this.time -= 10;
          if (this.time <= 0) {
            clearInterval(this.timer);
            this.timer = null;
            this.time = null;
          }
        }, 10);
      } else {
        this.$emit("doubleclick");
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
          this.time = null;
        }
      }
    },
  },
});
</script>
