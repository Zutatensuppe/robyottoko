export default {
  name: 'volume-slider',
  template: `<div class="control has-icons-left has-icons-right range volume-slider">
    <input type="range" class="input is-small" min="0" max="100" v-model="volume" />
    <span class="icon is-small is-left">
      <i class="fa fa-volume-down"/>
    </span>
    <span class="icon is-small is-right">
      <i class="fa fa-volume-up"/>
    </span>
  </div>`,
  props: {
    value: Number,
  },
  data() {
    return {
      volume: 100,
    }
  },
  created() {
    this.volume = this.value
    this.$watch('value', () => {
      this.volume = this.value
    })
    this.$watch('volume', () => {
      this.$emit('input', this.volume)
    })
  },
}
