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
  data: () => ({
    time: null,
    timer: null,
  }),
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

<style scoped>
.doubleclick-button {
  position: relative;
}

.doubleclick-button-message {
  position: absolute;
  right: 100%;
  margin-right: 1em;
  background: var(--main-background-color);
  border-style: solid;
  border-color: #dbdbdb;
  border-width: 1px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
}

.doubleclick-button-timout-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  display: block;
  height: 0;
  border-top: 2px solid;
}
</style>
