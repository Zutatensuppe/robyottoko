import AvatarAnimation from '../components/avatar-animation.js'

// import exampleTuberPara from '../avatar-examples/para-png-tuber/def.js'
// import exampleTuberHyottoko from '../avatar-examples/hyottoko/def.js'

const SPEAKING_THRESHOLD = 0.05
// in ff enable for usage with localhost (and no https):
// media.devices.insecure.enabled
// media.getusermedia.insecure.enabled

export default {
  template: `<div class="base" v-if="initialized">
    <div class="avatar">
      <avatar-animation v-for="(anim,idx) in animations" :key="idx" :frames="anim.frames" :width="256" :height="256" />
    </div>

    <table>
      <tr v-for="(def,idx) in tuberDef.slotDefinitions" :key="idx">
        <td>{{def.slot}}:</td>
        <td><button @click="setSlot(def.slot, idx2)" v-for="(item,idx2) in def.items">{{item.title}}</button></td>
      </tr>
      <tr>
        <td>State:</td>
        <td><button v-for="(def,idx) in tuberDef.stateDefinitions" :key="idx" @click="lockState(def.value)">{{def.value}}</button></td>
      </tr>
      <tr>
        <td>Tubers:</td>
        <td><button @click="setTuber(avatarDef)" v-for="avatarDef in settings.avatarDefinitions">{{avatarDef.name}}</button></td>
      </tr>
    </table>
  </div>`,
  components: {
    AvatarAnimation,
  },
  props: {
    ws: Object,
  },
  data() {
    return {
      speaking: false,
      lockedState: 'default',
      initialized: false,
      tuber: {
        slot: {},
      },
      tuberDef: null,
      settings: null,
      // tuberDefs: [ exampleTuberPara, exampleTuberHyottoko ],
    }
  },
  computed: {
    animationName() {
      if (this.lockedState !== 'default') {
        return this.lockedState
      }
      return this.speaking ? 'speaking' : 'default'
    },
    animations() {
      return this.tuberDef.slotDefinitions.map((slotDef) => {
        const item = slotDef.items[this.tuber.slot[slotDef.slot]];
        const stateDef = item.states.find(({ state }) => state === this.animationName);
        if (stateDef.frames.length > 0) {
          return stateDef
        }
        return item.states.find(({ state }) => state === 'default')
      })
    },
  },
  methods: {
    setSlot(slotName, itemIdx) {
      this.tuber.slot[slotName] = itemIdx
      this.tuber.slot = Object.assign({}, this.tuber.slot)
    },
    setSpeaking(speaking) {
      if (this.speaking !== speaking) {
        this.speaking = speaking
      }
    },
    lockState(lockedState) {
      if (this.lockedState !== lockedState) {
        this.lockedState = lockedState
      }
    },
    setTuber(tuber) {
      this.tuber.slot = {}
      this.tuberDef = JSON.parse(JSON.stringify(tuber))
      this.tuberDef.slotDefinitions.forEach(slotDef => {
        this.tuber.slot[slotDef.slot] = slotDef.defaultItemIndex
      })
    },
    webaudio_tooling_obj() {
      console.log("audio is starting up ...");

      const BUFF_SIZE = 16384;

      if (!navigator.getUserMedia) {
        navigator.getUserMedia = (
          navigator.getUserMedia
          || navigator.webkitGetUserMedia
          || navigator.mozGetUserMedia
          || navigator.msGetUserMedia
        );
      }
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { audio: true },
          function (stream) {
            start_microphone(stream);
          },
          function (e) {
            alert('Error capturing audio.');
          }
        );
      } else {
        alert('getUserMedia not supported in this browser.');
      }

      const process_microphone_buffer = (event) => { // invoked by event loop
        const microphone_output_buffer = event.inputBuffer.getChannelData(0);
        let speaking = false
        for (let i = 0; i < microphone_output_buffer.length; i++) {
          if (microphone_output_buffer[i] > SPEAKING_THRESHOLD) {
            speaking = true
            break
          }
        }
        this.setSpeaking(speaking)
      }

      function start_microphone(stream) {
        const audioContext = new AudioContext();
        const gain_node = audioContext.createGain();
        const microphone_stream = audioContext.createMediaStreamSource(stream);
        microphone_stream.connect(gain_node);
        const script_processor_node = audioContext.createScriptProcessor(BUFF_SIZE, 1, 1);
        script_processor_node.onaudioprocess = process_microphone_buffer;
        microphone_stream.connect(script_processor_node);
      }
    },
  },
  created() {
    // this.setTuber(this.tuberDefs[0])
  },
  async mounted() {
    this.ws.onMessage('init', (data) => {
      this.settings = data.settings
      this.setTuber(this.settings.avatarDefinitions[0])
      this.initialized = true
      this.webaudio_tooling_obj()
    })
    this.ws.connect()
  }
}
