export default {
  template: `
  <span class="avatar-animation">
    <img v-if="src" :src="src" :width="width" :height="height" />
    <span v-else :style="styles"></span>
  </span>`,
  props: {
    frames: {
      type: Array,
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
  data() {
    return {
      timeout: null,
      idx: -1,
    };
  },
  watch: {
    frames: {
      handler(newFrames, oldFrames) {
        this.nextFrame();
      },
      deep: true,
    },
  },
  computed: {
    src() {
      if (this.idx >= 0 && this.idx < this.frames.length) {
        return this.frames[this.idx].url;
      }
      return "";
    },
    styles() {
      return {
        width: `${this.width}px`,
        height: `${this.width}px`,
        display: 'inline-block',
      }
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
  },
  unmounted() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  },
};
