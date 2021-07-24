import fn from '../fn.js'

export default {
  template: `<span>{{humanReadable}}</span>`,
  props: {
    value: {
      type: Number | String,
      required: true,
    },
  },
  computed: {
    humanReadable() {
      return fn.humanDuration(fn.parseHumanDuration(this.value))
    },
  },
}
