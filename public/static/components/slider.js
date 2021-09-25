export default {
  name: 'slider',
  template: `<div class="columns">
    <div class="column is-four-fifth">
      <div class="control has-icons-left has-icons-right range slider">
        <input type="range" class="input is-small" :min="min" :max="max" v-model="curVal" @input="valChange" />
        <span class="icon is-small is-left">
          <i class="fa" :class="iconLeft" />
        </span>
        <span class="icon is-small is-right">
          <i class="fa" :class="iconRight" />
        </span>
      </div>
    </div>
    <div class="column is-one-fifth">
      <input type="number" class="input is-small" v-model="curVal" @input="valChange" />
    </div>
  </div>`,
  props: {
    value: Number,
    iconLeft: String,
    iconRight: String,
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: 100,
    },
  },
  data() {
    return {
      curVal: 100,
    }
  },
  methods: {
    valChange() {
      this.$emit('input', this.curVal)
    },
  },
  created() {
    this.curVal = this.value
  },
}
