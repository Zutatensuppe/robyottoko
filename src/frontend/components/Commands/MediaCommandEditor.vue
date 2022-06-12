<template>
  <div class="modal is-active" v-if="item">
    <div class="modal-background" @click="onOverlayClick"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ title }}</p>
        <button class="delete" aria-label="close" @click="onCloseClick"></button>
      </header>
      <section class="modal-card-body">
        <table class="table is-striped">
          <tbody>
            <tr>
              <td>Triggers:</td>
              <td>
                <trigger-editor v-for="(trigger, idx) in item.triggers" :key="idx" class="spacerow"
                  :modelValue="trigger" :channelPointsCustomRewards="channelPointsCustomRewards"
                  :removable="item.triggers.length > 1" @update:modelValue="item.triggers[idx] = $event"
                  @remove="rmtrigger(idx)" />
                <dropdown-button :actions="possibleTriggerActions" label="Add trigger" @click="addtrigger" />
              </td>
            </tr>
            <tr v-if="actionDescription">
              <td>Description:</td>
              <td v-html="actionDescription"></td>
            </tr>
            <tr v-if="requiresAccessToken">
              <td>Attention:</td>
              <td>
                <div class="help">
                  This requires <code>Access Token</code> to be set in the user
                  settings.
                </div>
              </td>
            </tr>
            <tr>
              <td>Widgets:</td>
              <td>
                <div class="field has-addons" v-if="item.data.widgetIds.length === 0">
                  This media will show in the&nbsp;
                  <a :href="`${widgetUrl}`" target="_blank">default widget</a>.
                </div>
                <div class="field has-addons" v-for="(id, idx) in item.data.widgetIds" :key="idx">
                  <div class="control mr-1">
                    <input type="text" class="input is-small" v-model="item.data.widgetIds[idx]" />
                  </div>
                  <a class="button is-small mr-1" :href="`${widgetUrl}?id=${encodeURIComponent(id)}`"
                    target="_blank">Open widget</a>
                  <button class="button is-small" @click="rmWidgetId(idx)">
                    <i class="fa fa-remove" />
                  </button>
                </div>
                <div class="field">
                  <button class="button is-small" @click="addWidgetId">
                    <i class="fa fa-plus mr-1" /> Add widget
                  </button>
                </div>
                <div>
                  <p class="help">
                    Define in which widgets this media should show up in.
                    Leave the list empty to only show in the default widget.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td>Type:</td>
              <td>
                <label class="mr-1"><input type="radio" v-model="type" value="image" /> Image</label>
                <label class="mr-1"><input type="radio" v-model="type" value="image,sound" /> Image + Sound</label>
                <label class="mr-1"><input type="radio" v-model="type" value="sound" /> Sound</label>
                <label class="mr-1"><input type="radio" v-model="type" value="video" /> Video</label>
              </td>
            </tr>
            <tr v-if="type === 'image' || type === 'image,sound'">
              <td>Display-Duration:</td>
              <td>
                <div class="control has-icons-left">
                  <duration-input :modelValue="item.data.minDurationMs"
                    @update:modelValue="item.data.minDurationMs = $event" />
                  <span class="icon is-small is-left">
                    <i class="fa fa-hourglass"></i>
                  </span>
                </div>
                <div class="help">
                  The minimum duration that images will be displayed.
                  Sound will always play for their full length
                  regardless of this setting.
                </div>
              </td>
            </tr>
            <tr v-if="type === 'image' || type === 'image,sound'">
              <td>Image:</td>
              <td>
                <image-upload v-model="item.data.image" @update:modelValue="mediaImgChanged" />
              </td>
            </tr>
            <tr v-if="type === 'image' || type === 'image,sound'">
              <td>Image (by URL):</td>
              <td>
                <input type="text" class="input is-small" v-model="item.data.image_url" />
                <div>
                  <span class="button is-small" @click="
                    item.data.image_url = '$user($args).profile_image_url'
                  ">Twitch profile image of user given by args</span>
                  <span class="button is-small" @click="item.data.image_url = '$user.profile_image_url'">Twitch profile
                    image
                    of user who executes the command</span>
                </div>
              </td>
            </tr>
            <tr v-if="type === 'sound' || type === 'image,sound'">
              <td>Sound:</td>
              <td>
                <sound-upload v-model="item.data.sound" :baseVolume="baseVolume" @update:modelValue="mediaSndChanged" />
              </td>
            </tr>
            <tr v-if="type === 'video'">
              <td>Video:</td>
              <td>
                <table>
                  <tr>
                    <td>Url:</td>
                    <td>
                      <input type="text" class="input is-small" v-model="item.data.video.url" />
                    </td>
                  </tr>
                  <tr>
                    <td>Volume:</td>
                    <td>
                      <volume-slider v-model="item.data.video.volume" />
                    </td>
                  </tr>
                </table>
                <div class="help">
                  The video url has to be a twitch clip url
                  (<code>https://clips.twitch.tv/...</code>) or a URL to a
                  video file (a URL usually ending in <code>.mp4</code> or
                  similar).
                  Currently Youtube or other Video Hosters are not supported.
                </div>
                <div>
                  <span class="button is-small" @click="
                    item.data.video.url = '$user($args).recent_clip_url'
                  ">A recent twitch clip of user given by args</span>
                  <span class="button is-small" @click="item.data.video.url = '$user.recent_clip_url'">A recent
                    twitch clip of user who executes the command</span>
                </div>
              </td>
            </tr>
            <tr>
              <td>Variables:</td>
              <td>
                <table v-if="item.variables.length > 0">
                  <thead>
                    <tr>
                      <td>Name</td>
                      <td>Value</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(v, idx) in item.variables" :key="idx">
                      <td>
                        <input type="text" class="input is-small" v-model="v.name" />
                      </td>
                      <td>
                        <input type="text" class="input is-small" v-model="v.value" />
                      </td>
                      <td>
                        <button class="button is-small" @click="rmVariable(idx)">
                          <i class="fa fa-remove" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <span class="button is-small" @click="onAddVariable">Add Variable</span>
                <div class="help">
                  Variables can be used from the command with
                  <code>$var(variable_name)</code>. If the referenced variable
                  is not defined here,
                  <a href="/variables/" target="_blank">global variables</a> are
                  used.
                </div>
              </td>
            </tr>
            <tr>
              <td>Variable changes:</td>
              <td>
                <table v-if="item.variableChanges.length > 0">
                  <thead>
                    <tr>
                      <td>Name</td>
                      <td>Change</td>
                      <td>Value</td>
                      <td></td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(v, idx) in item.variableChanges" :key="idx">
                      <td>
                        <dropdown-input v-model="v.name"
                          :values="autocompletableVariables().map(a => ({ value: a.var.name, label: `${a.var.name} (${a.type}), <code>${a.var.value}</code>` }))" />
                      </td>
                      <td>
                        <div class="select is-small">
                          <select v-model="v.change">
                            <option value="set">set</option>
                            <option value="increase_by">increase by</option>
                            <option value="decrease_by">decrease by</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <input type="text" class="input is-small" v-model="v.value" />
                      </td>
                      <td>
                        <button class="button is-small" @click="rmVariableChange(idx)">
                          <i class="fa fa-remove" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <span class="button is-small" @click="onAddVariableChange">Add Variable Change</span>
                <div class="help">
                  Variable changes are performed when the command is executed,
                  before anything else.
                </div>
              </td>
            </tr>
            <tr>
              <td>Permissions:</td>
              <td>
                <label v-for="(perm, idx) in possiblePermissions" :key="idx" class="mr-1">
                  <input type="checkbox" v-model="item.restrict_to" :value="perm.value" />
                  {{ perm.label }}
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-small is-primary" :disabled="!valid" @click="onSaveClick">
          Save changes
        </button>
        <button class="button is-small" @click="onCancelClick">Cancel</button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

import { permissions } from "../../../common/permissions";
import {
  commands,
  isValidTrigger,
  newTrigger,
} from "../../../common/commands";
import {
  Command,
  CommandAction,
  CommandTrigger,
  CommandTriggerType,
  CommandVariable,
  CommandVariableChange,
  GlobalVariable,
  MediaCommand,
  MediaFile,
  SoundMediaFile,
} from "../../../types";

interface AutocompletableVariable {
  var: CommandVariable | GlobalVariable;
  type: string;
}

interface ComponentDataPermission {
  value: string;
  label: string;
}

interface ComponentData {
  item: MediaCommand | null;
  type: string;
  variableChangeFocusIdx: number;
  possiblePermissions: ComponentDataPermission[];
}

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<MediaCommand>,
      required: true,
    },
    mode: {
      type: String as PropType<"create" | "edit">,
      required: true,
    },
    globalVariables: {
      type: Array as PropType<GlobalVariable[]>,
      required: true,
    },
    channelPointsCustomRewards: {
      type: Object as PropType<Record<string, string[]>>,
      required: true,
    },
    baseVolume: {
      default: 100,
    },
    widgetUrl: {
      type: String,
      required: false,
      default: "",
    },
  },
  emits: ["update:modelValue", "cancel"],
  data: (): ComponentData => ({
    item: null,
    type: '',
    variableChangeFocusIdx: -1,
    possiblePermissions: permissions,
  }),
  mounted() {
    this.item = JSON.parse(JSON.stringify(this.modelValue));
    if (this.item) {
      if (this.item.data.video.url) {
        this.type = 'video'
      } else if (this.item.data.sound.file) {
        if (this.item.data.image.file || this.item.data.image_url) {
          this.type = 'image,sound'
        } else {
          this.type = 'sound'
        }
      } else {
        this.type = 'image'
      }
    }
    this.$nextTick(() => {
      const el = this.$el.querySelector('input[type="text"]');
      el.focus();
    });
  },
  watch: {
    modelValue: {
      handler(v) {
        this.item = JSON.parse(JSON.stringify(v));
      },
    },
  },
  methods: {
    addWidgetId(): void {
      if (!this.item) {
        console.warn("addWidgetId: this.item not initialized");
        return;
      }
      this.item.data.widgetIds.push('');
    },
    addtrigger(trigger: any): void {
      if (!this.item) {
        console.warn("addtrigger: this.item not initialized");
        return;
      }
      this.item.triggers.push(newTrigger(trigger.type));
    },
    onAddVariableChange(): void {
      if (!this.item) {
        console.warn("onAddVariableChange: this.item not initialized");
        return;
      }
      this.item.variableChanges.push({
        name: "",
        change: "set",
        value: "",
      });
    },
    rmVariableChange(idx: number): void {
      if (!this.item) {
        console.warn("rmVariableChange: this.item not initialized");
        return;
      }
      this.item.variableChanges = this.item.variableChanges.filter(
        (_val: CommandVariableChange, index: number) => index !== idx
      );
    },
    onAddVariable(): void {
      if (!this.item) {
        console.warn("onAddVariable: this.item not initialized");
        return;
      }
      this.item.variables.push({
        name: "",
        value: "",
      });
    },
    rmVariable(idx: number): void {
      if (!this.item) {
        console.warn("rmVariable: this.item not initialized");
        return;
      }
      this.item.variables = this.item.variables.filter(
        (_val: CommandVariable, index: number) => index !== idx
      );
    },
    onSaveClick(): void {
      this.$emit("update:modelValue", this.item);
    },
    onCancelClick(): void {
      this.$emit("cancel");
    },
    onCloseClick(): void {
      this.$emit("cancel");
    },
    onOverlayClick(): void {
      this.$emit("cancel");
    },
    mediaSndChanged(file: SoundMediaFile): void {
      if (!this.item) {
        console.warn("mediaSndChanged: this.item not initialized");
        return;
      }
      this.item.data.sound = file;
    },
    mediaImgChanged(file: MediaFile): void {
      if (!this.item) {
        console.warn("mediaImgUploaded: this.item not initialized");
        return;
      }
      this.item.data.image = file;
    },
    rmWidgetId(idx: number): void {
      if (!this.item) {
        console.warn("rmWidgetId: this.item not initialized");
        return;
      }
      this.item.data.widgetIds = this.item.data.widgetIds.filter(
        (_val: string, index: number) => index !== idx
      );
    },
    rmtrigger(idx: number): void {
      if (!this.item) {
        console.warn("rmtrigger: this.item not initialized");
        return;
      }
      this.item.triggers = this.item.triggers.filter(
        (_val: CommandTrigger, index: number) => index !== idx
      );
    },
    autocompletableVariables(): AutocompletableVariable[] {
      if (!this.item) {
        console.warn("autocompletableVariables: this.item not initialized");
        return [];
      }
      const variables: AutocompletableVariable[] = this.item.variables.slice().map((localVar: CommandVariable) => {
        return {
          var: localVar,
          type: "local",
        };
      });
      this.globalVariables.forEach((globalVar: GlobalVariable) => {
        if (
          !variables.find((localVar) => localVar.var.name === globalVar.name)
        ) {
          variables.push({
            var: globalVar,
            type: "global",
          });
        }
      });
      return variables
    },
  },
  computed: {
    requiresAccessToken(): boolean {
      if (!this.item) {
        return false;
      }
      return commands[this.item.action].RequiresAccessToken();
    },
    possibleTriggerActions() {
      return [
        { type: CommandTriggerType.COMMAND, label: "Add Command", title: "Command" },
        { type: CommandTriggerType.FIRST_CHAT, label: "Add First Chat", title: "First Chat" },
        {
          type: CommandTriggerType.REWARD_REDEMPTION,
          label: "Add Reward Redemption",
          title: "Reward Redemption",
        },
        { type: CommandTriggerType.TIMER, label: "Add Timer", title: "Timer" },
      ];
    },
    valid(): boolean {
      if (!this.item) {
        return false;
      }

      // check if all triggers are correct
      for (const trigger of this.item.triggers) {
        if (!isValidTrigger(trigger)) {
          return false;
        }
      }

      // check if settings are correct
      if (this.item.action === CommandAction.TEXT) {
        for (const t of this.item.data.text) {
          if (t === "") {
            return false;
          }
        }
      }

      return true;
    },
    actionDescription(): string {
      if (!this.item) {
        return "";
      }
      return commands[this.item.action].Description();
    },
    title(): string {
      if (!this.item) {
        return "";
      }
      const verb = {
        create: "Create new ",
        edit: "Edit ",
      };
      return `${verb[this.mode]}${commands[this.item.action].Name()}`;
    },
  },
});
</script>
