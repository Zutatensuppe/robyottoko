<template>
  <div
    v-if="initialized && tuberDef"
    class="base"
  >
    <div
      class="avatar"
      :style="{
        width: `${tuberDef.width}px`,
        height: `${tuberDef.height}px`,
      }"
    >
      <AvatarAnimation
        v-for="(anim, idx) in animations"
        :key="idx"
        :frames="anim.frames"
        :width="tuberDef.width"
        :height="tuberDef.height"
      />
    </div>

    <table v-if="controls && showControls">
      <tr v-if="!avatarFixed">
        <td>Tubers:</td>
        <td>
          <button
            v-for="(avatarDef, idx) in settings.avatarDefinitions"
            :key="idx"
            :class="{ active: tuberIdx === idx }"
            @click="setTuber(idx, true)"
          >
            {{ avatarDef.name }}
          </button>
        </td>
      </tr>
      <tr v-if="!avatarFixed">
        <td colspan="2">
          <hr>
        </td>
      </tr>
      <tr>
        <td>Start Mic</td>
        <td>
          <button @click="startMic">
            Start
          </button>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <hr>
        </td>
      </tr>
      <tr
        v-for="(def, idx) in tuberDef.slotDefinitions"
        :key="idx"
      >
        <td>{{ def.slot }}:</td>
        <td>
          <button
            v-for="(item, idx2) in def.items"
            :key="idx2"
            :class="{ active: slots[def.slot] === idx2 }"
            @click="setSlot(def.slot, idx2, true)"
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
            :class="{ active: lockedState === def.value }"
            @click="lockState(def.value, true)"
          >
            {{ def.value }}
          </button>
        </td>
      </tr>
    </table>
    <div
      v-if="controls"
      class="toggle-controls"
    >
      <button @click="showControls = !showControls">
        Toggle controls
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import AvatarAnimation from "../../components/Avatar/AvatarAnimation.vue";
import SoundMeter from "./soundmeter";
import util, { WidgetApiData } from "../util";
import WsClient from "../../WsClient";
import {
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleAvatarSlotItem,
  AvatarModuleSettings,
  AvatarModuleSlotItemStateDefinition,
  AvatarModuleWsInitData,
  default_settings,
} from "../../../mod/modules/AvatarModuleCommon";
import { logger } from "../../../common/fn";

const log = logger("Page.vue");

const DEFAULT_STATE = "default";
const SPEAKING_STATE = "speaking";

const DEFAULT_ITEM_STATE_DEFINITION = { state: DEFAULT_STATE, frames: [] };

const SPEAKING_THRESHOLD = 0.05;
// in ff enable for usage with localhost (and no https):
// about:config
//   media.devices.insecure.enabled
//   media.getusermedia.insecure.enabled

let ws: WsClient | null = null

const props = defineProps<{
  controls: boolean
  wdata: WidgetApiData
}>()

const speaking = ref<boolean>(false)
const initialized = ref<boolean>(false)
const audioInitialized = ref<boolean>(false)
const tuberIdx = ref<number>(-1)
const avatarFixed = ref<string>(util.getParam('avatar'))
const settings = ref<AvatarModuleSettings>(default_settings())
const showControls = ref<boolean>(true)

const tuberDef = computed(() => {
  if (
    tuberIdx.value < 0 ||
    tuberIdx.value >= settings.value.avatarDefinitions.length
  ) {
    return null;
  }
  return settings.value.avatarDefinitions[tuberIdx.value];
})
const slots = computed(() => {
  return tuberDef.value ? tuberDef.value.state.slots : {};
})
const lockedState = computed(() => {
  return tuberDef.value?.state.lockedState || DEFAULT_STATE;
})
const animationName = computed(() => {
  if (lockedState.value !== DEFAULT_STATE) {
    return lockedState.value;
  }
  return speaking.value ? SPEAKING_STATE : DEFAULT_STATE;
})
const animations = computed(() => {
  if (!tuberDef.value) {
    return [];
  }
  return tuberDef.value.slotDefinitions.map(getSlotStateDefinition);
})

// @ts-ignore
import('./main.css');


const getSlotStateDefinition = (
  slotDef: AvatarModuleAvatarSlotDefinition
): AvatarModuleSlotItemStateDefinition => {
  const item = getItem(slotDef);
  if (!item) {
    return DEFAULT_ITEM_STATE_DEFINITION;
  }
  const stateDef = item.states.find(
    ({ state }) => state === animationName.value
  );
  if (stateDef && stateDef.frames.length > 0) {
    return stateDef;
  }
  return (
    item.states.find(({ state }) => state === DEFAULT_STATE) ||
    DEFAULT_ITEM_STATE_DEFINITION
  );
}

const getItem = (
  slotDef: AvatarModuleAvatarSlotDefinition
): AvatarModuleAvatarSlotItem | null => {
  if (slotDef.items.length === 0) {
    return null;
  }
  let itemIdx = slots.value[slotDef.slot];
  if (typeof itemIdx === "undefined") {
    itemIdx = slotDef.defaultItemIndex;
  }
  if (itemIdx < 0 || itemIdx >= slotDef.items.length) {
    itemIdx = 0;
  }
  return slotDef.items[itemIdx];
}

const ctrl = (ctrl: string, args: any[]) => {
  if (!ws) {
    log.error("ctrl: ws not initialized");
    return;
  }
  ws.send(JSON.stringify({ event: "ctrl", data: { ctrl, args } }));
}

const setSlot = (slotName: string, itemIdx: number, sendCtrl: boolean = false) => {
  if (slots.value[slotName] === itemIdx) {
    return;
  }
  settings.value.avatarDefinitions[tuberIdx.value].state.slots[slotName] =
    itemIdx;
  if (sendCtrl) {
    ctrl("setSlot", [tuberIdx.value, slotName, itemIdx]);
  }
}

const setSpeaking = (newSpeaking: boolean, sendCtrl: boolean = false) => {
  if (speaking.value === newSpeaking) {
    return;
  }
  speaking.value = newSpeaking;
  if (sendCtrl) {
    ctrl("setSpeaking", [tuberIdx.value, newSpeaking]);
  }
}

const lockState = (newLockedState: string, sendCtrl: boolean = false) => {
  if (lockedState.value === newLockedState) {
    return;
  }
  settings.value.avatarDefinitions[tuberIdx.value].state.lockedState =
    newLockedState;
  if (sendCtrl) {
    ctrl("lockState", [tuberIdx.value, newLockedState]);
  }
}

const setTuber = (newTuberIdx: number, sendCtrl: boolean = false) => {
  if (!settings.value) {
    log.error("setTuber: this.settings not initialized");
    return;
  }
  if (avatarFixed.value) {
    newTuberIdx = settings.value.avatarDefinitions.findIndex(
      (def) => def.name === avatarFixed.value
    );
  }
  if (newTuberIdx >= settings.value.avatarDefinitions.length) {
    log.info("setTuber: index out of bounds. using index 0");
    newTuberIdx = 0;
  }
  if (newTuberIdx < 0 || newTuberIdx >= settings.value.avatarDefinitions.length) {
    log.error("setTuber: index out of bounds");
    return;
  }
  const newTuber = settings.value.avatarDefinitions[newTuberIdx];
  const newTuberDefStr = JSON.stringify(newTuber);
  const thisTuberDefStr = JSON.stringify(tuberDef.value);
  if (newTuberDefStr === thisTuberDefStr) {
    return;
  }
  tuberIdx.value = newTuberIdx;
  if (sendCtrl) {
    ctrl("setTuber", [tuberIdx.value]);
  }
}

const startMic = () => {
  if (audioInitialized.value) {
    return;
  }
  audioInitialized.value = true;
  if (!navigator.mediaDevices.getUserMedia) {
    alert(
      "navigator.mediaDevices.getUserMedia not supported in this browser."
    );
    return;
  }

  // ignore because of the webkitAudioContext fallback
  // @ts-ignore
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      const soundMeter = new SoundMeter(audioContext);
      soundMeter.connectToSource(stream, (e: any | null) => {
        if (e) {
          log.error({ e });
          return;
        }
        setInterval(() => {
          const threshold = speaking.value
            ? SPEAKING_THRESHOLD / 2
            : SPEAKING_THRESHOLD;
          setSpeaking(soundMeter.instant > threshold, true);
        }, 100);
      });
    })
    .catch((e) => {
      log.error({ e });
      alert("Error capturing audio.");
    });
}

const applyStyles = () => {
  if (!settings.value) {
    log.error("applyStyles: this.settings not initialized");
    return;
  }
  const styles = settings.value.styles;

  if (styles.bgColorEnabled && styles.bgColor != null) {
    document.body.style.backgroundColor = styles.bgColor;
  } else {
    document.body.style.backgroundColor = "";
  }
}

onMounted(() => {
  ws = util.wsClient(props.wdata)
  ws.onMessage("init", (data: AvatarModuleWsInitData) => {
    settings.value = data.settings
    nextTick(() => {
      applyStyles()
    })
    let tuberIdx = data.state.tuberIdx
    if (avatarFixed.value) {
      tuberIdx = settings.value.avatarDefinitions.findIndex(
        (def) => def.name === avatarFixed.value
      );
    }
    setTuber(tuberIdx === -1 ? 0 : tuberIdx)
    initialized.value = true
  });
  ws.onMessage("ctrl", ({ data }) => {
    if (data.ctrl === "setSlot") {
      const newTuberIdx = data.args[0]
      if (tuberIdx.value === newTuberIdx) {
        const slotName = data.args[1]
        const itemIdx = data.args[2]
        setSlot(slotName, itemIdx)
      }
    } else if (data.ctrl === "setSpeaking") {
      const newTuberIdx = data.args[0]
      if (tuberIdx.value === newTuberIdx) {
        const speaking = data.args[1]
        setSpeaking(speaking)
      }
    } else if (data.ctrl === "lockState") {
      const newTuberIdx = data.args[0]
      if (tuberIdx.value === newTuberIdx) {
        const lockedState = data.args[1]
        lockState(lockedState)
      }
    } else if (data.ctrl === "setTuber") {
      const tuberIdx = data.args[0]
      setTuber(tuberIdx)
    }
  })
  ws.connect()
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
