export default {
  name: 'volume-slider',
  template: `<span class="range volume-slider">
  <i class="fa fa-volume-down"/>
  <input type="range" min="0" max="100" v-model="volume" />
  <i class="fa fa-volume-up"/>
</span>`,
  props: {
    value: Number,
  },
  data () {
    return {
      volume: 100,
    }
  },
  created () {
    this.volume = this.value
    this.$watch('volume', () => {
      this.$emit('input', this.volume)
    })
  },
}
