import fn from '../fn.js'

import exampleTuberPara from '../avatar-examples/para-png-tuber/def.js'
import exampleTuberHyottoko from '../avatar-examples/hyottoko/def.js'

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
      <button @click="setSlot(def.slot, item.url, true)" v-for="(item,idx2) in def.items">{{item.title}}</button>
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
      return this.tuberDef.slotDefinitions.map(slotDef => this.tuber.slot[slotDef.slot]).filter(slot => !!slot)
    },
    animationName() {
      if (this.lockedState !== 'default') {
        return this.lockedState
      }
      return this.speaking ? 'speaking' : 'default'
    },
  },
  methods: {
    setSlot(slot, url, doSetAnimation) {
      if (url) {
        this.tuber.slot[slot] = url
        if (doSetAnimation) {
          this.setAnimation(slot, url)
        }
      } else {
        delete this.tuber.slot[slot]
        if (doSetAnimation) {
          this.setAnimation(slot, null)
        }
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
    setAnimation(slot, url) {
      if (this.slotTimeouts[slot]) {
        clearTimeout(this.slotTimeouts[slot])
        delete this.slotTimeouts[slot]
      }
      if (!url) {
        return
      }
      for (let slotDef of this.tuberDef.slotDefinitions) {
        if (slotDef.slot !== slot) {
          continue
        }
        for (let item of slotDef.items) {
          if (item.url !== url) {
            continue
          }
          if (!item.animation) {
            return
          }

          ////////

          const animationName = this.animationName
          const anim = item.animation.find(({ state }) => animationName === state)
          const duration = anim?.frames[0]?.duration || 100
          let animationFrameIdx = 0
          const nextFrame = () => {
            const animationName = this.animationName
            const anim = item.animation.find(({ state }) => animationName === state)
            if (!anim || anim.frames.length === 0)  {
              this.setSlot(slot, item.url, false)
              this.slotTimeouts[slot] = setTimeout(nextFrame, 100)
              return
            }

            const animationFrames = anim.frames
            animationFrameIdx++
            if (animationFrameIdx >= animationFrames.length) {
              animationFrameIdx = 0
            }
            this.setSlot(slot, animationFrames[animationFrameIdx].url, false)
            this.slotTimeouts[slot] = setTimeout(nextFrame, animationFrames[animationFrameIdx].duration)
          }
          this.slotTimeouts[slot] = setTimeout(nextFrame, duration)
        }
      }
    },
    setTuber(tuber) {
      for (let slot in this.slotTimeouts) {
        clearTimeout(this.slotTimeouts[slot])
        delete this.slotTimeouts[slot]
      }
      this.tuber.slot = {}
      this.tuberDef = JSON.parse(JSON.stringify(tuber))
      console.log(JSON.parse(JSON.stringify(tuber)))
      for (let slotDefinition of this.tuberDef.slotDefinitions) {
        this.setSlot(slotDefinition.slot, slotDefinition.items[slotDefinition.defaultItemIndex].url, true)
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
          {audio:true},
          function(stream) {
            start_microphone(stream);
          },
          function(e) {
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
          if (microphone_output_buffer[i] > 0.3) {
            speaking = true
            break
          }
        }
        this.setSpeaking(speaking)
      }

      function start_microphone(stream){
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
