import fn from '../fn.js'

export default {
  template: `<input class="input is-small spaceinput" :class="classes" v-model="v" />`,
  props: {
    modelValue: {
      type: String | Number,
      required: true,
    },
  },
  emits: [
    'update:modelValue'
  ],
  data() {
    return {
      v: '',
      valid: true,
    }
  },
  computed: {
    classes() {
      if (this.valid) {
        return []
      }
      return ['has-background-danger-light', 'has-text-danger-dark']
    },
  },
  mounted() {
    this.v = `${this.modelValue}`
  },
  watch: {
    v: {
      handler(v) {
        try {
          fn.mustParseHumanDuration(v)
          this.valid = true
        } catch (e) {
          this.valid = false
        }
        this.$emit('update:modelValue', v)
      }
    },
    modelValue: {
      handler(v) {
        this.v = `${v}`
      },
    },
  },
}
