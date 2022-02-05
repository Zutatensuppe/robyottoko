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
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { logger } from "../../common/fn";

import AvatarAnimation from "../../frontend/components/Avatar/AvatarAnimation.vue";
import WsClient from "../../frontend/WsClient";
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleSettings,
  AvatarModuleWsInitData,
  default_settings,
} from "../../mod/modules/AvatarModuleCommon";
import util from "../util";

const log = logger("Page.vue");

interface ComponentData {
  ws: null | WsClient;
  speaking: boolean;
  lockedState: string;
  initialized: boolean;
  tuber: {
    slot: Record<string, any>;
  };
  tuberDef: null | AvatarModuleAvatarDefinition;
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
      tuber: {
        slot: {},
      },
      tuberDef: null,
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
    setSlot(slotName: string, itemIdx: number) {
      this.tuber.slot[slotName] = itemIdx;
      this.tuber.slot = Object.assign({}, this.tuber.slot);
    },
    setSpeaking(speaking: boolean) {
      if (this.speaking !== speaking) {
        this.speaking = speaking;
      }
    },
    lockState(lockedState: string) {
      if (this.lockedState !== lockedState) {
        this.lockedState = lockedState;
      }
    },
    setTuber(idx: number) {
      if (!this.settings) {
        log.error("setTuber: this.settings not initialized");
        return;
      }
      if (idx < 0 || idx >= this.settings.avatarDefinitions.length) {
        log.error("setTuber: index out of bounds");
        return;
      }
      const tuber = this.settings.avatarDefinitions[idx];
      this.tuber.slot = {};
      this.tuberDef = JSON.parse(
        JSON.stringify(tuber)
      ) as AvatarModuleAvatarDefinition;
      this.tuberDef.slotDefinitions.forEach((slotDef) => {
        this.tuber.slot[slotDef.slot] = slotDef.defaultItemIndex;
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
        const tuber = data.args[0];
        this.setTuber(tuber);
      }
    });
    this.ws.connect();
  },
});
</script>
