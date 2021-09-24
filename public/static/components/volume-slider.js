import Slider from '../components/slider.js'

export default {
  name: 'volume-slider',
  components: {
    Slider,
  },
  template: `<slider class="volume-slider" iconLeft="fa-volume-down" iconRight="fa-volume-up" min="0" max="100" v-model="volume" @input="valChange" />`,
  props: {
    value: Number,
  },
  data() {
    return {
      volume: 100,
    }
  },
  methods: {
    valChange() {
      this.$emit('input', this.volume)
    },
  },
  created() {
    this.volume = this.value
  },
}
