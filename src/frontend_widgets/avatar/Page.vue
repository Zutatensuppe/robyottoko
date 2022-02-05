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
            v-for="(item, idx2) in def.items"
            :key="idx2"
            @click="setSlot(def.slot, idx2, true)"
            :class="{ active: tuber.slot[def.slot] === idx2 }"
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
            @click="lockState(def.value, true)"
            :class="{ active: lockedState === def.value }"
          >
            {{ def.value }}
          </button>
        </td>
      </tr>
      <tr>
        <td>Tubers:</td>
        <td>
          <button
            v-for="(avatarDef, idx) in settings.avatarDefinitions"
            :key="idx"
            @click="setTuber(idx, true)"
            :class="{ active: tuberIdx === idx }"
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
import WsClient from "../../frontend/WsClient";
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleSettings,
  AvatarModuleWsInitData,
  default_settings,
} from "../../mod/modules/AvatarModuleCommon";
import { logger } from "../../common/fn";

const log = logger("Page.vue");

const SPEAKING_THRESHOLD = 0.05;
// in ff enable for usage with localhost (and no https):
// media.devices.insecure.enabled
// media.getusermedia.insecure.enabled

interface ComponentData {
  ws: null | WsClient;
  speaking: boolean;
  lockedState: string;
  initialized: boolean;
  audioInitialized: boolean;
  tuber: {
    slot: Record<string, any>;
  };
  tuberDef: null | AvatarModuleAvatarDefinition;
  tuberIdx: number;
  settings: AvatarModuleSettings;
}

export default defineComponent({
  components: {
    AvatarAnimation,
  },
  data(): ComponentData {
    return {
      ws: null,
      speaking: false,
      lockedState: "default",
      initialized: false,
      audioInitialized: false,
      tuber: { slot: {} },
      tuberDef: null,
      tuberIdx: -1,
      settings: default_settings(),
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
      if (!this.tuberDef) {
        return [];
      }
      return this.tuberDef.slotDefinitions.map(
        (slotDef: AvatarModuleAvatarSlotDefinition) => {
          const item = slotDef.items[this.tuber.slot[slotDef.slot]];
          if (!item) {
            return { title: "", states: [] };
          }
          const stateDef = item.states.find(
            ({ state }) => state === this.animationName
          );
          if (stateDef && stateDef.frames.length > 0) {
            return stateDef;
          }
          return item.states.find(({ state }) => state === "default");
        }
      );
    },
  },
  methods: {
    ctrl(ctrl: string, args: any[]) {
      if (!this.ws) {
        log.error("ctrl: this.ws not initialized");
        return;
      }
      this.ws.send(JSON.stringify({ event: "ctrl", data: { ctrl, args } }));
    },
    setSlot(slotName: string, itemIdx: number, sendCtrl: boolean = false) {
      if (this.tuber.slot[slotName] === itemIdx) {
        return;
      }
      this.tuber.slot[slotName] = itemIdx;
      this.tuber.slot = Object.assign({}, this.tuber.slot);
      if (sendCtrl) {
        this.ctrl("setSlot", [slotName, itemIdx]);
      }
    },
    setSpeaking(speaking: boolean, sendCtrl: boolean = false) {
      if (this.speaking === speaking) {
        return;
      }
      this.speaking = speaking;
      if (sendCtrl) {
        this.ctrl("setSpeaking", [speaking]);
      }
    },
    lockState(lockedState: string, sendCtrl: boolean = false) {
      if (this.lockedState === lockedState) {
        return;
      }
      this.lockedState = lockedState;
      if (sendCtrl) {
        this.ctrl("lockState", [lockedState]);
      }
    },
    setTuber(idx: number, sendCtrl: boolean = false) {
      if (!this.settings) {
        log.error("setTuber: this.settings not initialized");
        return;
      }
      if (idx < 0 || idx >= this.settings.avatarDefinitions.length) {
        log.error("setTuber: index out of bounds", idx);
        return;
      }
      const tuber = this.settings.avatarDefinitions[idx];
      const tuberDefStr = JSON.stringify(tuber);
      const thisTuberDefStr = JSON.stringify(this.tuberDef);
      if (tuberDefStr === thisTuberDefStr) {
        return;
      }
      this.tuberIdx = idx;
      this.tuber.slot = {};
      this.tuberDef = JSON.parse(tuberDefStr) as AvatarModuleAvatarDefinition;
      this.tuberDef.slotDefinitions.forEach((slotDef) => {
        this.tuber.slot[slotDef.slot] = slotDef.defaultItemIndex;
      });
      if (sendCtrl) {
        this.ctrl("setTuber", [idx]);
      }
    },
    startMic() {
      if (this.audioInitialized) {
        return;
      }
      this.audioInitialized = true;
      if (!navigator.mediaDevices.getUserMedia) {
        alert(
          "navigator.mediaDevices.getUserMedia not supported in this browser."
        );
        return;
      }

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const soundMeter = new SoundMeter(audioContext);
          soundMeter.connectToSource(stream, (e) => {
            if (e) {
              log.error(e);
              return;
            }
            setInterval(() => {
              const threshold = this.speaking
                ? SPEAKING_THRESHOLD / 2
                : SPEAKING_THRESHOLD;
              this.setSpeaking(soundMeter.instant > threshold, true);
            }, 100);
          });
        })
        .catch((e) => {
          log.error(e);
          alert("Error capturing audio.");
        });
    },
    applyStyles() {
      if (!this.settings) {
        log.error("applyStyles: this.settings not initialized");
        return;
      }
      const styles = this.settings.styles;

      if (styles.bgColor != null) {
        document.bgColor = styles.bgColor;
      }
    },
  },
  mounted() {
    this.ws = util.wsClient("avatar");
    this.ws.onMessage("init", (data: AvatarModuleWsInitData) => {
      this.settings = data.settings;
      this.$nextTick(() => {
        this.applyStyles();
      });
      this.setTuber(data.state.tuberIdx === -1 ? 0 : data.state.tuberIdx);
      for (const slotName of Object.keys(data.state.slots)) {
        this.setSlot(slotName, data.state.slots[slotName]);
      }
      this.lockState(data.state.lockedState);
      this.initialized = true;
    });
    this.ws.onMessage("ctrl", ({ data }) => {
      if (data.ctrl === "setSlot") {
        const slotName = data.args[0];
        const itemIdx = data.args[1];
        this.setSlot(slotName, itemIdx);
      } else if (data.ctrl === "setSpeaking") {
        const speaking = data.args[0];
        this.setSpeaking(speaking);
      } else if (data.ctrl === "lockState") {
        const lockedState = data.args[0];
        this.lockState(lockedState);
      } else if (data.ctrl === "setTuber") {
        const tuberIdx = data.args[0];
        this.setTuber(tuberIdx);
      }
    });
    this.ws.connect();
  },
});
</script>
