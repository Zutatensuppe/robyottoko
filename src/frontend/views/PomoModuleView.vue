<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <NavbarElement />
      <div
        id="actionbar"
        class="p-1"
      >
        <button
          class="button is-small is-primary mr-1"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
        <a
          class="button is-small mr-1"
          :href="widgetUrl"
          target="_blank"
        >Open widget</a>
      </div>
    </div>
    <div
      id="main"
      ref="main"
    >
      <table
        v-if="inited"
        ref="table"
        class="table is-striped"
      >
        <tbody>
          <tr>
            <td colspan="2">
              Pomo
            </td>
          </tr>
          <tr>
            <td><code>settings.color</code></td>
            <td>
              <input
                v-model="settings.color"
                class="input is-small"
                type="color"
              >
            </td>
            <td>The text color in the widget.</td>
          </tr>
          <tr>
            <td><code>settings.fontFamily</code></td>
            <td>
              <StringInput v-model="settings.fontFamily" />
            </td>
            <td>The font in the widget.</td>
          </tr>
          <tr>
            <td><code>settings.fontSize</code></td>
            <td>
              <StringInput v-model="settings.fontSize" />
            </td>
            <td>
              The text size in the widget, for example <code>12px</code>,
              <code>20pt</code>.
            </td>
          </tr>
          <tr>
            <td><code>settings.timerFormat</code></td>
            <td>
              <StringInput v-model="settings.timerFormat" />
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
              <StringInput v-model="settings.finishedText" />
            </td>
            <td>Text that is displayed when the timer reaches 0.</td>
          </tr>
          <tr>
            <td><code>settings.showTimerWhenFinished</code></td>
            <td>
              <CheckboxInput v-model="settings.showTimerWhenFinished" />
            </td>
            <td>
              If enabled, the timer will be displayed even when it reached 0.
            </td>
          </tr>
          <tr>
            <td><code>settings.startEffect.chatMessage</code></td>
            <td>
              <StringInput v-model="settings.startEffect.chatMessage" />
            </td>
            <td>Chat message that is sent when pomo is started.</td>
          </tr>
          <tr>
            <td><code>settings.startEffect.sound</code></td>
            <td>
              <SoundUpload
                v-model="settings.startEffect.sound"
                :base-volume="100"
              />
            </td>
            <td>Sound that will be displayed when pomo is started.</td>
          </tr>
          <tr>
            <td><code>settings.endEffect.chatMessage</code></td>
            <td>
              <StringInput v-model="settings.endEffect.chatMessage" />
            </td>
            <td>Chat message that is sent when pomo reaches 0.</td>
          </tr>
          <tr>
            <td><code>settings.endEffect.sound</code></td>
            <td>
              <SoundUpload
                v-model="settings.endEffect.sound"
                :base-volume="100"
              />
            </td>
            <td>Sound that will be displayed when pomo reaches 0.</td>
          </tr>
          <tr>
            <td><code>settings.stopEffect.chatMessage</code></td>
            <td>
              <StringInput v-model="settings.stopEffect.chatMessage" />
            </td>
            <td>
              Chat message that is sent when pomo is stopped (via pomo exit).
            </td>
          </tr>
          <tr>
            <td><code>settings.stopEffect.sound</code></td>
            <td>
              <SoundUpload
                v-model="settings.stopEffect.sound"
                :base-volume="100"
              />
            </td>
            <td>
              Sound that will be displayed when pomo is stopped (via pomo exit).
            </td>
          </tr>
          <tr>
            <td>
              <code>settings.notifications</code>
              <span
                class="button is-small"
                @click="addNotification"
              >Add notification</span>
            </td>
            <td>
              <div
                v-for="(n, idx) in settings.notifications"
                :key="idx"
              >
                <span
                  class="button is-small"
                  @click="removeNotification(idx)"
                >Remove</span>
                <table>
                  <tr>
                    <td><code>offsetMs</code></td>
                    <td>
                      <DurationInput
                        v-model="n.offsetMs"
                        :allow-negative="true"
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
                      <StringInput v-model="n.effect.chatMessage" />
                    </td>
                    <td>Chat message sent at the set offset.</td>
                  </tr>
                  <tr>
                    <td><code>sound</code></td>
                    <td>
                      <SoundUpload
                        v-model="n.effect.sound"
                        :base-volume="100"
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
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import util from "../util";
import {
  default_notification,
  default_settings,
  PomoModuleSettings,
  PomoModuleWsDataData,
  PomoModuleWsSaveData,
} from "../../mod/modules/PomoModuleCommon";
import WsClient from "../WsClient";
import StringInput from "../components/StringInput.vue";
import SoundUpload from "../components/SoundUpload.vue";
import DurationInput from "../components/DurationInput.vue";
import NavbarElement from "../components/NavbarElement.vue";
import CheckboxInput from "../components/CheckboxInput.vue";

let ws: WsClient | null = null
const unchangedJson = ref<string>("{}")
const changedJson = ref<string>("{}")
const settings = ref<PomoModuleSettings>(default_settings())
const inited = ref<boolean>(false)
const widgetUrl = ref<string>("")

const changed = computed((): boolean => unchangedJson.value !== changedJson.value)

const sendMsg = (data: PomoModuleWsSaveData) => {
  if (!ws) {
    console.warn("sendMsg: ws not initialized");
    return;
  }
  ws.send(JSON.stringify(data));
}

const sendSave = () => {
  sendMsg({
    event: "save",
    settings: settings.value,
  });
}

const addNotification = () => {
  settings.value.notifications.push(default_notification());
}

const removeNotification = (idx: number) => {
  settings.value.notifications = settings.value.notifications.filter((val, index) => index !== idx);
}

watch(settings, (val) => {
  changedJson.value = JSON.stringify(val);
}, { deep: true })

onMounted(() => {
  ws = util.wsClient("pomo");
  ws.onMessage("init", (data: PomoModuleWsDataData) => {
    settings.value = data.settings;
    unchangedJson.value = JSON.stringify(data.settings);
    widgetUrl.value = data.widgetUrl;
    inited.value = true;
  });
  ws.connect();
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect();
  }
})
</script>
