import fn from '../fn.js'

export default {
  template: `<span v-if="tag === 'span'">{{humanReadable}}</span><code v-else>{{humanReadable}}</code>`,
  props: {
    value: {
      type: Number | String,
      required: true,
    },
  },
  computed: {
    tag() {
      try {
        fn.mustParseHumanDuration(this.value)
        return 'span'
      } catch (e) {
        return 'code'
      }
    },
    humanReadable() {
      try {
        return fn.humanDuration(fn.mustParseHumanDuration(this.value))
      } catch (e) {
        return this.value
      }
    },
  },
}
