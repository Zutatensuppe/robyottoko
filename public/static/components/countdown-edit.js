import Upload from '../components/upload.js'
import DurationInput from '../components/duration-input.js'
import Player from '../components/player.js'
import VolumeSlider from '../components/volume-slider.js'
import ResponsiveImage from '../components/responsive-image.js'
import commands from '../commands.js'

export default {
  name: 'countdown-edit',
  components: {
    Upload,
    DurationInput,
    Player,
    VolumeSlider,
    ResponsiveImage,
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
        <div class="control has-icons-left" v-else-if="a.type ==='text'">
          <input class="input is-small" type="text" v-model="a.value" />
          <span class="icon is-small is-left">
            <i class="fa fa-comments-o"></i>
          </span>
        </div>
        <div class="control has-icons-left" v-else-if="a.type ==='media'">
          <table>
            <tr>
              <td>Image:</td>
              <td>
                <responsive-image v-if="a.value.image.file" :src="a.value.image.file" :title="a.value.image.filename" width="100%" height="90" style="display:block;" />
                <button v-if="a.value.image.file" class="button is-small" @click="a.value.image.file = null"><i class="fa fa-remove mr-1" /> Remove</button>
                <br v-if="a.value.image.file" />
                <upload
                  @uploaded="mediaImgUploaded(idx, $event)"
                  accept="image/*"
                  label="Upload Image"
                  :class="{'mt-1': a.value.image.file}" />
              </td>
            </tr>
            <tr>
              <td>Sound:</td>
              <td>
                <player v-if="a.value.sound.file" :src="a.value.sound.file" :name="a.value.sound.filename" :volume="a.value.sound.volume" class="button is-small" />
                <volume-slider v-if="a.value.sound.file" v-model="a.value.sound.volume" />
                <button v-if="a.value.sound.file" class="button is-small" @click="a.value.sound.file = null"><i class="fa fa-remove mr-1" /> Remove</button>
                <br v-if="a.value.sound.file" />
                <upload
                  @uploaded="mediaSndUploaded(idx, $event)"
                  accept="audio/*"
                  label="Upload Sound"
                  :class="{'mt-1': a.value.sound.file}" />
              </td>
            </tr>
            <tr>
              <td>Duration:</td>
              <td>
                <div class="control has-icons-left">
                  <duration-input
                    :modelValue="a.value.minDurationMs"
                    @update:modelValue="a.value.minDurationMs = $event"
                    />
                  <span class="icon is-small is-left">
                    <i class="fa fa-hourglass"></i>
                  </span>
                </div>
              </td>
            </tr>
          </table>
        </div>
        <div class="control">
          <button class="button is-small" @click="rmaction(idx)"><i class="fa fa-remove" /></button>
        </div>
      </div>
      <button class="button is-small" @click="onAddDelay"><i class="fa fa-hourglass mr-1" /> Add Delay</button>
      <button class="button is-small" @click="onAddText"><i class="fa fa-comments-o mr-1" /> Add Chat</button>
      <button class="button is-small" @click="onAddMedia"><i class="fa fa-picture-o mr-1" /> Add Media</button>
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
    onAddDelay() {
      this.countdown.actions.push({ type: 'delay', value: '1s' })
    },
    onAddText() {
      this.countdown.actions.push({ type: 'text', value: commands.newText() })
    },
    onAddMedia() {
      this.countdown.actions.push({ type: 'media', value: commands.newMedia() })
    },
    rmaction(idx) {
      this.countdown.actions = this.countdown.actions.filter((val, index) => index !== idx)
    },
    mediaSndUploaded(idx, data) {
      this.countdown.actions[idx].value.sound.filename = data.originalname
      this.countdown.actions[idx].value.sound.file = data.filename
    },
    mediaImgUploaded(idx, data) {
      this.countdown.actions[idx].value.image.filename = data.originalname
      this.countdown.actions[idx].value.image.file = data.filename
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
        interval: this.countdown.interval,
        intro: this.countdown.intro,
        outro: this.countdown.outro,
      })
    }, { deep: true })
  },
}
