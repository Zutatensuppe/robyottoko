<template>
  <media-queue-element ref="q" :baseVolume="settings.volume" />
</template>
<script lang="ts">
import { defineComponent } from "vue";
import MediaQueueElement, { MediaQueueElementInstance } from "../MediaQueueElement.vue";
import util from "../util";
import WsClient from "../../frontend/WsClient";
import {
  GeneralModuleSettings,
  default_settings,
} from "../../mod/modules/GeneralModuleCommon";
import { newMedia } from "../../common/commands";

interface ComponentData {
  ws: WsClient | null;
  settings: GeneralModuleSettings;
  commandId: string;
}

export default defineComponent({
  components: {
    MediaQueueElement,
  },
  data(): ComponentData {
    return {
      ws: null,
      settings: default_settings(),
      commandId: '',
    };
  },
  created() {
    this.commandId = util.getParam('id')
  },
  computed: {
    q(): MediaQueueElementInstance {
      return this.$refs.q as MediaQueueElementInstance
    },
  },
  mounted() {
    this.ws = util.wsClient("media");
    this.ws.onMessage("init", (data) => {
      this.settings = data.settings;
    });
    this.ws.onMessage("playmedia", (data, origData) => {
      if (!this.commandId && data.excludeFromGlobalWidget) {
        // skipping this because it should not be displayed in global widget
      } else if (this.commandId && this.commandId !== origData.id) {
        // skipping this, as it isn't coming from right command
      } else {
        this.q.playmedia(newMedia(data));
      }
    });
    this.ws.connect();
  },
});
</script>
