<template>
  <div class="base" v-if="initialized">
    <div
      class="avatar"
      :style="{
        width: `${tuberDef.width}px`,
        height: `${tuberDef.height}px`,
      }"
    >
      <avatar-animation
        v-for="(anim, idx) in animations"
        :key="idx"
        :frames="anim.frames"
        :width="tuberDef.width"
        :height="tuberDef.height"
      />
    </div>

    <table>
      <tr>
        <td>Start Mic</td>
        <td><button @click="startMic">Start</button></td>
      </tr>
      <tr v-for="(def, idx) in tuberDef.slotDefinitions" :key="idx">
        <td>{{ def.slot }}:</td>
        <td>
          <button
            @click="setSlot(def.slot, idx2)"
            v-for="(item, idx2) in def.items"
            :key="idx2"
          >
            {{ item.title }}
          </button>
        </td>
      </tr>
      <tr>
        <td>State:</td>
        <td>
          <button
            v-for="(def, idx) in tuberDef.stateDefinitions"
            :key="idx"
            @click="lockState(def.value)"
          >
            {{ def.value }}
          </button>
        </td>
      </tr>
      <tr>
        <td>Tubers:</td>
        <td>
          <button
            @click="setTuber(avatarDef)"
            v-for="(avatarDef, idx) in settings.avatarDefinitions"
            :key="idx"
          >
            {{ avatarDef.name }}
          </button>
        </td>
      </tr>
    </table>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

import AvatarAnimation from "../../frontend/components/Avatar/AvatarAnimation.vue";
import SoundMeter from "./soundmeter.js";
import util from "../util";

const SPEAKING_THRESHOLD = 0.05;
// in ff enable for usage with localhost (and no https):
// media.devices.insecure.enabled
// media.getusermedia.insecure.enabled

export default defineComponent({
  components: {
    AvatarAnimation,
  },
  data() {
    return {
      ws: null,

      speaking: false,
      lockedState: "default",
      initialized: false,
      audioInitialized: false,
      tuber: {
        slot: {},
      },
      tuberDef: null,
      settings: null,
      // tuberDefs: [ exampleTuberPara, exampleTuberHyottoko ],
    };
  },
  computed: {
    animationName() {
      if (this.lockedState !== "default") {
        return this.lockedState;
      }
      return this.speaking ? "speaking" : "default";
    },
    animations() {
      return this.tuberDef.slotDefinitions.map((slotDef) => {
        const item = slotDef.items[this.tuber.slot[slotDef.slot]];
        const stateDef = item.states.find(
          ({ state }) => state === this.animationName
        );
        if (stateDef.frames.length > 0) {
          return stateDef;
        }
        return item.states.find(({ state }) => state === "default");
      });
    },
  },
  methods: {
    ctrl(ctrl, args) {
      this.ws.send(JSON.stringify({ event: "ctrl", data: { ctrl, args } }));
    },
    setSlot(slotName, itemIdx) {
      this.tuber.slot[slotName] = itemIdx;
      this.tuber.slot = Object.assign({}, this.tuber.slot);
      this.ctrl("setSlot", [slotName, itemIdx]);
    },
    setSpeaking(speaking) {
      if (this.speaking !== speaking) {
        this.speaking = speaking;
        this.ctrl("setSpeaking", [speaking]);
      }
    },
    lockState(lockedState) {
      if (this.lockedState !== lockedState) {
        this.lockedState = lockedState;
        this.ctrl("lockState", [lockedState]);
      }
    },
    setTuber(tuber) {
      this.tuber.slot = {};
      this.tuberDef = JSON.parse(JSON.stringify(tuber));
      this.tuberDef.slotDefinitions.forEach((slotDef) => {
        this.tuber.slot[slotDef.slot] = slotDef.defaultItemIndex;
      });
      this.ctrl("setTuber", [tuber]);
    },
    startMic() {
      if (this.audioInitialized) {
        return;
      }
      this.audioInitialized = true;
      if (!navigator.getUserMedia) {
        navigator.getUserMedia =
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia ||
          navigator.msGetUserMedia;
      }
      if (!navigator.getUserMedia) {
        alert("getUserMedia not supported in this browser.");
        return;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const soundMeter = new SoundMeter(audioContext);
          soundMeter.connectToSource(stream, (e) => {
            if (e) {
              console.log(e);
              return;
            }
            setInterval(() => {
              const threshold = this.speaking
                ? SPEAKING_THRESHOLD / 2
                : SPEAKING_THRESHOLD;
              this.setSpeaking(soundMeter.instant.toFixed(2) > threshold);
            }, 100);
          });
        })
        .catch((e) => {
          console.log(e);
          alert("Error capturing audio.");
        });
    },
    applyStyles() {
      const styles = this.settings.styles;

      if (styles.bgColor != null) {
        document.bgColor = styles.bgColor;
      }
    },
  },
  mounted() {
    this.ws = util.wsClient("avatar");
    this.ws.onMessage("init", (data) => {
      this.settings = data.settings;
      this.$nextTick(() => {
        this.applyStyles();
      });
      this.setTuber(this.settings.avatarDefinitions[0]);
      this.initialized = true;
    });
    this.ws.connect();
  },
});
</script>
