<template>
  <media-queue-element ref="q" :baseVolume="settings.volume" />
</template>
<script lang="ts">
import { defineComponent } from "vue";
import MediaQueueElement from "../MediaQueueElement.vue";
import util from "../util";
import WsClient from "../../frontend/WsClient";
import {
  GeneralModuleSettings,
  default_settings,
} from "../../mod/modules/GeneralModuleCommon";

interface ComponentData {
  ws: WsClient | null;
  settings: GeneralModuleSettings;
}

export default defineComponent({
  components: {
    MediaQueueElement,
  },
  data(): ComponentData {
    return {
      ws: null,
      settings: default_settings(),
    };
  },
  mounted() {
    this.ws = util.wsClient("general");
    this.ws.onMessage("init", (data) => {
      this.settings = data.settings;
    });
    this.ws.onMessage("playmedia", (data) => {
      this.$refs["q"].playmedia(data);
    });
    this.ws.connect();
  },
});
</script>
