export default {
  name: 'countdown-edit',
  template: `
  <div>
    <label><input type="radio" value="manual" v-model="countdown.type"/> Manual</label>
    <label><input type="radio" value="auto" v-model="countdown.type"/> Auto</label>

    <div v-if="countdown.type === 'auto'">
      <div class="spacerow">
          <label class="spacelabel">Steps </label>
          <input class="spaceinput" v-model="countdown.steps" />
      </div>
      <div class="spacerow">
          <label class="spacelabel">Interval </label>
          <input class="spaceinput" v-model="countdown.interval" />
      </div>
      <div class="spacerow">
          <label class="spacelabel">Intro </label>
          <input class="spaceinput" v-model="countdown.intro" />
      </div>
      <div class="spacerow">
          <label class="spacelabel">Outro </label>
          <input class="spaceinput" v-model="countdown.outro" />
      </div>
    </div>
    <div v-else>
      <div v-for="(a,idx) in countdown.actions" :key="idx">
        <label>
          <i class="fa" :class="{'fa-hourglass': a.type==='delay', 'fa-comments-o': a.type==='text'}" />:
          <input type="text" v-model="a.value" />
        </label>
        <button class="btn" @click="rmaction(idx)"><i class="fa fa-remove" /></button>
      </div>
      <button class="btn" @click="countdown.actions.push({type:'delay', value: 1000})"><i class="fa fa-hourglass" /> Add Delay</button>
      <button class="btn" @click="countdown.actions.push({type:'text', value: ''})"><i class="fa fa-comments-o" /> Add Chat</button>
    </div>
  </div>`,
  props: {
    value: {
      type: Object,
      required: true,
    },
  },
  data () {
    return {
      countdown: {
        type: 'manual',

        // settings for manual
        actions: [],

        // settings for auto (old style)
        steps: 3,
        interval: 1000,
        intro: '',
        outro: '',
      },
    }
  },
  methods: {
    rmaction(idx) {
      this.countdown.actions = this.countdown.actions.filter((val, index) => index !== idx)
    },
  },
  created () {
    // old countdowns are automatic
    this.countdown.type = this.value.type || 'auto'

    this.countdown.actions = this.value.actions || []

    this.countdown.steps = this.value.steps
    this.countdown.interval = this.value.interval
    this.countdown.intro = this.value.intro
    this.countdown.outro = this.value.outro

    this.$watch('countdown', () => {
      this.$emit('input', {
        type: this.countdown.type,

        actions: this.countdown.actions,

        steps: parseInt(this.countdown.steps, 10) || 0,
        interval: parseInt(this.countdown.interval, 10) || 0,
        intro: this.countdown.intro,
        outro: this.countdown.outro,
      })
    }, { deep: true })
  },
}
