import DurationInput from '../components/duration-input.js'

export default {
  name: 'countdown-edit',
  components: {
    DurationInput,
  },
  template: `
  <div>
    <div class="control">
      <label class="radio">
        <input type="radio" value="manual" v-model="countdown.type"/>
        Manual
      </label>
      <label class="radio">
        <input type="radio" value="auto" v-model="countdown.type"/>
        Auto
      </label>
    </div>

    <div v-if="countdown.type === 'auto'">
      <div class="spacerow">
          <label class="spacelabel">Steps </label>
          <input class="input is-small spaceinput" v-model="countdown.steps" />
      </div>
      <div class="spacerow">
          <label class="spacelabel">Interval </label>
          <duration-input
            :modelValue="countdown.interval"
            @update:modelValue="countdown.interval = $event"
            />
      </div>
      <div class="spacerow">
          <label class="spacelabel">Intro </label>
          <input class="input is-small spaceinput" v-model="countdown.intro" />
      </div>
      <div class="spacerow">
          <label class="spacelabel">Outro </label>
          <input class="input is-small spaceinput" v-model="countdown.outro" />
      </div>
    </div>
    <div v-else>
      <div class="field has-addons mr-1" v-for="(a,idx) in countdown.actions" :key="idx">
        <div class="control has-icons-left" v-if="a.type==='delay'">
          <duration-input
            :modelValue="a.value"
            @update:modelValue="a.value = $event"
            />
          <span class="icon is-small is-left">
            <i class="fa fa-hourglass"></i>
          </span>
        </div>
        <div class="control has-icons-left" v-else>
          <input class="input is-small" type="text" v-model="a.value" />
          <span class="icon is-small is-left">
            <i class="fa fa-comments-o"></i>
          </span>
        </div>
        <div class="control">
          <button class="button is-small" @click="rmaction(idx)"><i class="fa fa-remove" /></button>
        </div>
      </div>
      <button class="button is-small" @click="countdown.actions.push({type:'delay', value: '1s'})"><i class="fa fa-hourglass mr-1" /> Add Delay</button>
      <button class="button is-small" @click="countdown.actions.push({type:'text', value: ''})"><i class="fa fa-comments-o mr-1" /> Add Chat</button>
    </div>
  </div>`,
  props: {
    value: {
      type: Object,
      required: true,
    },
  },
  data() {
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
  created() {
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
