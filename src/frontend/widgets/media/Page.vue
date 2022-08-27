<template>
  <media-queue-element
    ref="q"
    :base-volume="settings.volume"
  />
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import MediaQueueElement, { MediaQueueElementInstance } from "../MediaQueueElement.vue";
import util, { WidgetApiData } from "../util";
import WsClient from "../../WsClient";
import {
  GeneralModuleSettings,
  default_settings,
} from "../../../mod/modules/GeneralModuleCommon";
import { newMedia } from "../../../common/commands";

interface ComponentData {
  ws: WsClient | null;
  settings: GeneralModuleSettings;
  widgetId: string;
}

export default defineComponent({
  components: {
    MediaQueueElement,
  },
  props: {
    wdata: { type: Object as PropType<WidgetApiData>, required: true }
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
    this.ws = util.wsClient(this.wdata);
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
