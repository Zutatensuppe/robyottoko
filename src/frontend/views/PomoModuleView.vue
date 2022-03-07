<template>
  <div class="view">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
        <button
          class="button is-small is-primary mr-1"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
        <a class="button is-small mr-1" :href="widgetUrl" target="_blank"
          >Open widget</a
        >
      </div>
    </div>
    <div id="main" ref="main">
      <table class="table is-striped" ref="table" v-if="inited">
        <tbody>
          <tr>
            <td colspan="2">Pomo</td>
          </tr>
          <tr>
            <td><code>settings.color</code></td>
            <td>
              <input
                class="input is-small"
                type="color"
                v-model="settings.color"
              />
            </td>
            <td>The text color in the widget.</td>
          </tr>
          <tr>
            <td><code>settings.fontFamily</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.fontFamily"
              />
            </td>
            <td>The font in the widget.</td>
          </tr>
          <tr>
            <td><code>settings.fontSize</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.fontSize"
              />
            </td>
            <td>
              The text size in the widget, for example <code>12px</code>,
              <code>20pt</code>.
            </td>
          </tr>
          <tr>
            <td><code>settings.timerFormat</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.timerFormat"
              />
            </td>
            <td>
              Format of the timer, you can use the following placeholders:
              <code v-html="'{{hh}}'" /> for hours,
              <code v-html="'{{mm}}'" /> for minutes,
              <code v-html="'{{ss}}'" /> for seconds.
            </td>
          </tr>
          <tr>
            <td><code>settings.finishedText</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.finishedText"
              />
            </td>
            <td>Text that is displayed when the timer reaches 0.</td>
          </tr>
          <tr>
            <td><code>settings.showTimerWhenFinished</code></td>
            <td>
              <input
                class="is-small"
                type="checkbox"
                v-model="settings.showTimerWhenFinished"
              />
            </td>
            <td>
              If enabled, the timer will be displayed even when it reached 0.
            </td>
          </tr>
          <tr>
            <td><code>settings.startEffect.chatMessage</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.startEffect.chatMessage"
              />
            </td>
            <td>Chat message that is sent when pomo is started.</td>
          </tr>
          <tr>
            <td><code>settings.startEffect.sound</code></td>
            <td>
              <sound-upload
                v-model="settings.startEffect.sound"
                :baseVolume="100"
              />
            </td>
            <td>Sound that will be displayed when pomo is started.</td>
          </tr>
          <tr>
            <td><code>settings.endEffect.chatMessage</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.endEffect.chatMessage"
              />
            </td>
            <td>Chat message that is sent when pomo reaches 0.</td>
          </tr>
          <tr>
            <td><code>settings.endEffect.sound</code></td>
            <td>
              <sound-upload
                v-model="settings.endEffect.sound"
                :baseVolume="100"
              />
            </td>
            <td>Sound that will be displayed when pomo reaches 0.</td>
          </tr>
          <tr>
            <td><code>settings.stopEffect.chatMessage</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.stopEffect.chatMessage"
              />
            </td>
            <td>
              Chat message that is sent when pomo is stopped (via pomo exit).
            </td>
          </tr>
          <tr>
            <td><code>settings.stopEffect.sound</code></td>
            <td>
              <sound-upload
                v-model="settings.stopEffect.sound"
                :baseVolume="100"
              />
            </td>
            <td>
              Sound that will be displayed when pomo is stopped (via pomo exit).
            </td>
          </tr>
          <tr>
            <td>
              <code>settings.notifications</code>
              <span class="button is-small" @click="addNotification"
                >Add notification</span
              >
            </td>
            <td>
              <div v-for="(n, idx) in settings.notifications" :key="idx">
                <span class="button is-small" @click="removeNotification(idx)"
                  >Remove</span
                >
                <table>
                  <tr>
                    <td><code>offsetMs</code></td>
                    <td>
                      <duration-input
                        v-model="n.offsetMs"
                        :allowNegative="true"
                      />
                    </td>
                    <td>
                      Offset to the end of pomo. Negative offset means time
                      before end of pomo.
                    </td>
                  </tr>
                  <tr>
                    <td><code>chatMessage</code></td>
                    <td>
                      <input
                        class="input is-small"
                        type="text"
                        v-model="n.effect.chatMessage"
                      />
                    </td>
                    <td>Chat message sent at the set offset.</td>
                  </tr>
                  <tr>
                    <td><code>sound</code></td>
                    <td>
                      <sound-upload
                        v-model="n.effect.sound"
                        :baseVolume="100"
                      />
                    </td>
                    <td>Sound played at the set offset.</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import util from "../util";
import {
  PomoModuleData,
  PomoModuleWsSaveData,
  default_settings,
  default_notification,
} from "../../mod/modules/PomoModuleCommon";
import WsClient from "../WsClient";

export default defineComponent({
  data: () => ({
    unchangedJson: "{}",
    changedJson: "{}",
    settings: default_settings(),
    inited: false,
    ws: null as WsClient | null,
  }),
  watch: {
    settings: {
      deep: true,
      handler(ch) {
        this.changedJson = JSON.stringify(ch);
      },
    },
  },
  computed: {
    changed(): boolean {
      return this.unchangedJson !== this.changedJson;
    },
    widgetUrl(): string {
      return util.widgetUrl("pomo");
    },
  },
  methods: {
    sendMsg(data: PomoModuleWsSaveData) {
      if (!this.ws) {
        console.warn("sendMsg: this.ws not initialized");
        return;
      }
      this.ws.send(JSON.stringify(data));
    },
    sendSave() {
      if (!this.settings) {
        console.warn("sendSave: this.settings not initialized");
        return;
      }
      this.sendMsg({
        event: "save",
        settings: this.settings,
      });
    },
    addNotification() {
      this.settings.notifications.push(default_notification());
    },
    removeNotification(idx: number) {
      if (!this.settings) {
        console.warn("remove: this.settings not initialized");
        return;
      }
      this.settings.notifications = this.settings.notifications.filter(
        (val, index) => index !== idx
      );
    },
  },
  async mounted() {
    this.ws = util.wsClient("pomo");
    this.ws.onMessage("init", (data: PomoModuleData) => {
      this.settings = data.settings;
      this.unchangedJson = JSON.stringify(data.settings);
      this.inited = true;
    });
    this.ws.connect();
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect();
    }
  },
});
</script>
