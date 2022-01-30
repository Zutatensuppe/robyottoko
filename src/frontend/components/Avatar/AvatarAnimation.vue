<template>
  <span
    class="avatar-animation"
    :style="{
      width: `${width}px`,
      height: `${width}px`,
    }"
  >
    <img v-if="src" :src="src" :width="width" :height="height" />
    <span
      v-else
      :style="{
        width: `${width}px`,
        height: `${width}px`,
        display: 'inline-block',
      }"
    />
  </span>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { AvatarModuleAnimationFrameDefinition } from "../../../mod/modules/AvatarModule";

interface ComponentData {
  timeout: NodeJS.Timeout | null;
  idx: number;
}

export default defineComponent({
  props: {
    frames: {
      type: Array as PropType<AvatarModuleAnimationFrameDefinition[]>,
      required: true,
    },
    width: {
      type: Number,
      required: false,
      default: 64,
    },
    height: {
      type: Number,
      required: false,
      default: 64,
    },
  },
  data(): ComponentData {
    return {
      timeout: null,
      idx: -1,
    };
  },
  computed: {
    src(): string {
      if (this.idx >= 0 && this.idx < this.frames.length) {
        return this.frames[this.idx].url;
      }
      return "";
    },
  },
  methods: {
    nextFrame() {
      if (this.frames.length === 0) {
        this.idx = -1;
        return;
      }
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      this.idx++;
      if (this.idx >= this.frames.length) {
        this.idx = 0;
      }
      this.timeout = setTimeout(() => {
        this.nextFrame();
      }, this.frames[this.idx].duration);
    },
  },
  created() {
    this.nextFrame();
    this.$watch(
      "frames",
      () => {
        this.nextFrame();
      },
      { deep: true }
    );
  },
  unmounted() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  },
});
</script>
