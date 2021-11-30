import fn from '../fn.js'

import exampleTuberPara from '../avatar-examples/para-png-tuber/def.js'
import exampleTuberHyottoko from '../avatar-examples/hyottoko/def.js'

const SPEAKING_THRESHOLD = 0.05
// in ff enable for usage with localhost (and no https):
// media.devices.insecure.enabled
// media.getusermedia.insecure.enabled

export default {
  template: `<div class="base" v-if="initialized">
    <div class="avatar">
      <img class="avatar-item" v-for="(item,idx) in slotArray" :key="idx" :src="item" />
    </div>

    <div v-for="(def,idx) in tuberDef.slotDefinitions" :key="idx">
      {{def.slot}}:
      <button @click="setSlot(idx, idx2, 0, true)" v-for="(item,idx2) in def.items">{{item.title}}</button>
    </div>

    State:
    <button v-for="(def,idx) in tuberDef.stateDefinitions" :key="idx" @click="lockState(def.value)">{{def.value}}</button>

    Tubers:
    <div>
      <button @click="setTuber(avatarDef)" v-for="avatarDef in settings.avatarDefinitions">{{avatarDef.name}}</button>
    </div>
  </div>`,
  props: {
    ws: Object,
  },
  data() {
    return {
      speaking: false,
      lockedState: 'default',
      slotTimeouts: {},
      initialized: false,
      tuber: {
        slot: {},
        items: [],
      },
      tuberDef: null,
      settings: null,
      // tuberDefs: [ exampleTuberPara, exampleTuberHyottoko ],
    }
  },
  computed: {
    slotArray() {
      const arr = []
      for (let slotIdx in this.tuberDef.slotDefinitions) {
        const slotDef = this.tuberDef.slotDefinitions[slotIdx]
        const { itemIdx, animationFrameIdx } = this.tuber.slot[slotIdx]
        if (animationFrameIdx < 0 || !slotDef.items[itemIdx]) {
          continue
        }
        const stateDef = this.getStateDef(slotIdx, itemIdx)
        const frame = stateDef.frames[animationFrameIdx] || stateDef.frames[0]
        if (!frame || !frame.url) {
          continue
        }
        arr.push(frame.url)
      }
      return arr
    },
    animationName() {
      if (this.lockedState !== 'default') {
        return this.lockedState
      }
      return this.speaking ? 'speaking' : 'default'
    },
  },
  methods: {
    setSlot(slotIdx, itemIdx, animationFrameIdx, doSetAnimation) {
      this.tuber.slot[slotIdx] = { itemIdx, animationFrameIdx }
      if (doSetAnimation) {
        this.setAnimation(slotIdx, itemIdx, animationFrameIdx)
      }
      this.tuber.slot = Object.assign({}, this.tuber.slot)
    },
    setSpeaking(speaking) {
      if (this.speaking !== speaking) {
        this.speaking = speaking
        // TODO: start right animation immediately
        // for (let slot in this.tuber.slot) {
        //   this.setSlot(slot, this.tuber.slot[slot], true)
        // }
      }
    },
    lockState(lockedState) {
      if (this.lockedState !== lockedState) {
        this.lockedState = lockedState
        // TODO: start right animation immediately
        // for (let slot in this.tuber.slot) {
        //   this.setSlot(slot, this.tuber.slot[slot], true)
        // }
      }
    },
    getStateDef(slotIdx, itemIdx) {
      const slotDef = this.tuberDef.slotDefinitions[slotIdx]
      const item = slotDef.items[itemIdx]
      const stateDef = item.states.find(({ state }) => this.animationName === state)
      if (stateDef.frames.length > 0) {
        return stateDef
      }
      return item.states.find(({ state }) => 'default' === state)
    },
    setAnimation(slotIdx, itemIdx, animationFrameIdx) {
      if (this.slotTimeouts[slotIdx]) {
        clearTimeout(this.slotTimeouts[slotIdx])
        delete this.slotTimeouts[slotIdx]
      }

      const stateDef = this.getStateDef(slotIdx, itemIdx)
      const duration = stateDef?.frames[0]?.duration || 100
      let tmpFrameIdx = animationFrameIdx
      const nextFrame = () => {
        const stateDef = this.getStateDef(slotIdx, itemIdx)
        let duration
        if (!stateDef || stateDef.frames.length === 0) {
          tmpFrameIdx = -1
          duration = 100
        } else {
          tmpFrameIdx++
          if (tmpFrameIdx >= stateDef.frames.length) {
            tmpFrameIdx = 0
          }
          duration = stateDef.frames[tmpFrameIdx].duration
        }
        this.setSlot(slotIdx, itemIdx, tmpFrameIdx, false)
        this.slotTimeouts[slotIdx] = setTimeout(nextFrame, duration)
      }
      this.slotTimeouts[slotIdx] = setTimeout(nextFrame, duration)
    },
    setTuber(tuber) {
      for (let slot in this.slotTimeouts) {
        clearTimeout(this.slotTimeouts[slot])
        delete this.slotTimeouts[slot]
      }
      this.tuber.slot = {}
      this.tuberDef = JSON.parse(JSON.stringify(tuber))
      for (let slotIdx in this.tuberDef.slotDefinitions) {
        const slotDefinition = this.tuberDef.slotDefinitions[slotIdx]
        this.setSlot(slotIdx, slotDefinition.defaultItemIndex, 0, true)
      }
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
