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
  widgetId: string;
}

export default defineComponent({
  components: {
    MediaQueueElement,
  },
  data(): ComponentData {
    return {
      ws: null,
      settings: default_settings(),
      widgetId: '',
    };
  },
  computed: {
    q(): MediaQueueElementInstance {
      return this.$refs.q as MediaQueueElementInstance
    },
  },
  created() {
    // @ts-ignore
    import("./main.scss");
    this.widgetId = util.getParam('id')
  },
  mounted() {
    this.ws = util.wsClient("media");
    this.ws.onMessage("init", (data) => {
      this.settings = data.settings;
    });
    this.ws.onMessage("playmedia", (data) => {
      if (!this.widgetId && data.widgetIds.length > 0 && !data.widgetIds.includes('')) {
        // skipping this because it should not be displayed in global widget
      } else if (this.widgetId && !data.widgetIds.includes(this.widgetId)) {
        // skipping this, as it isn't coming from right command
      } else {
        this.q.playmedia(newMedia(data));
      }
    });
    this.ws.connect();
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect()
    }
  },
});
</script>
