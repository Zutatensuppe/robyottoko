<template>
  <div class="modal is-active" v-if="item">
    <div class="modal-background" @click="onOverlayClick"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ title }}</p>
        <button
          class="delete"
          aria-label="close"
          @click="onCloseClick"
        ></button>
      </header>
      <section class="modal-card-body">
        <table class="table is-striped">
          <tbody>
            <tr>
              <td>Triggers:</td>
              <td>
                <trigger-editor
                  v-for="(trigger, idx2) in item.triggers"
                  :key="idx2"
                  class="spacerow"
                  :modelValue="trigger"
                  :removable="item.triggers.length > 1"
                  @update:modelValue="item.triggers[idx2] = $event"
                  @remove="rmtrigger(idx2)"
                />
                <dropdown-button
                  :actions="possibleTriggerActions"
                  label="Add trigger"
                  @click="addtrigger"
                />
              </td>
            </tr>
            <tr v-if="actionDescriptions[item.action]">
              <td>Description:</td>
              <td v-html="actionDescriptions[item.action]"></td>
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
            <tr v-if="item.action === 'set_channel_title'">
              <td>Stream title:</td>
              <td>
                <input
                  class="input is-small spaceinput mb-1"
                  v-model="item.data.title"
                />
                <span class="button is-small mr-1" @click="item.data.title = ''"
                  >All args</span
                >
              </td>
            </tr>
            <tr v-if="item.action === 'set_channel_game_id'">
              <td>Stream category:</td>
              <td>
                <input
                  class="input is-small spaceinput mb-1"
                  v-model="item.data.game_id"
                />
                <span
                  class="button is-small mr-1"
                  @click="item.data.game_id = ''"
                  >All args</span
                >
              </td>
            </tr>
            <tr v-if="item.action === 'add_stream_tags'">
              <td>Tag to add:</td>
              <td>
                <input
                  class="input is-small spaceinput mb-1"
                  v-model="item.data.tag"
                />
                <span class="button is-small mr-1" @click="item.data.tag = ''"
                  >All args</span
                >
              </td>
            </tr>
            <tr v-if="item.action === 'remove_stream_tags'">
              <td>Tag to remove:</td>
              <td>
                <input
                  class="input is-small spaceinput mb-1"
                  v-model="item.data.tag"
                />
                <span class="button is-small mr-1" @click="item.data.tag = ''"
                  >All args</span
                >
              </td>
            </tr>
            <tr v-if="item.action === 'dict_lookup'">
              <td>Language:</td>
              <td>
                <input
                  class="input is-small spaceinput mb-1"
                  v-model="item.data.lang"
                />
                <span
                  v-for="(lang, idx) in dictLangs"
                  :key="idx"
                  class="button is-small mr-1"
                  @click="item.data.lang = lang.value"
                  :title="lang.title"
                  >{{ lang.flag }}</span
                >
                <span
                  class="button is-small mr-1"
                  @click="item.data.lang = '$args(0)'"
                  ><code>$args(0)</code></span
                >
              </td>
            </tr>
            <tr v-if="item.action === 'dict_lookup'">
              <td>Phrase:</td>
              <td>
                <input
                  class="input is-small spaceinput mb-1"
                  v-model="item.data.phrase"
                />
                <span
                  class="button is-small mr-1"
                  @click="item.data.phrase = ''"
                  >All args</span
                >
                <span
                  class="button is-small mr-1"
                  @click="item.data.phrase = '$args(1:)'"
                  ><code>$args(1:)</code></span
                >
              </td>
            </tr>
            <tr v-if="item.action === 'dict_lookup'">
              <td>Response:</td>
              <td>
                <div class="help">
                  Outputs the translation for the input phrase. The translation
                  is always from/to english. <br />
                  To let the user decide on the language use
                  <code>$args(0)</code> as language, and
                  <code>$args(1:)</code> as phrase. <br />
                  If phrase is left empty, all arguments to the command will be
                  used as the phrase.
                </div>
              </td>
            </tr>
            <tr v-if="item.action === 'madochan_createword'">
              <td>Response:</td>
              <td>Creates a word for a definition.</td>
            </tr>
            <tr v-if="item.action === 'madochan_createword'">
              <td>Model:</td>
              <td>
                <div class="control">
                  <input
                    class="input is-small spaceinput"
                    v-model="item.data.model"
                  />
                </div>
                <div class="help">
                  For possible values refer to
                  <a href="https://madochan.hyottoko.club/" target="_blank"
                    >madochan</a
                  >
                </div>
              </td>
            </tr>
            <tr v-if="item.action === 'madochan_createword'">
              <td>Weirdness:</td>
              <td>
                <div class="control">
                  <input
                    class="input is-small spaceinput"
                    v-model="item.data.weirdness"
                  />
                </div>
                <div class="help">
                  For possible values refer to
                  <a href="https://madochan.hyottoko.club/" target="_blank"
                    >madochan</a
                  >
                </div>
              </td>
            </tr>
            <tr v-if="item.action === 'chatters'">
              <td>Response:</td>
              <td>Outputs the people who chatted during the stream.</td>
            </tr>
            <tr v-if="item.action === 'text'">
              <td>Response:</td>
              <td>
                <div
                  v-for="(txt, idx2) in item.data.text"
                  :key="idx2"
                  class="field textarea-holder"
                >
                  <textarea
                    class="textarea"
                    type="text"
                    v-model="item.data.text[idx2]"
                    :class="{
                      'has-background-danger-light': !item.data.text[idx2],
                      'has-text-danger-dark': !item.data.text[idx2],
                    }"
                  />
                  <button
                    class="button is-small"
                    :disabled="item.data.text.length <= 1"
                    @click="rmtxt(idx2)"
                  >
                    <i class="fa fa-remove" />
                  </button>
                </div>
                <div class="field">
                  <button class="button is-small" @click="addtxt">
                    <i class="fa fa-plus mr-1" /> Add response
                  </button>
                </div>
                <div>
                  <p class="help">
                    If multiple responses exist, a random one will be used when
                    the command is triggered.
                  </p>
                </div>
              </td>
            </tr>
            <tr v-if="item.action === 'media'">
              <td>Image:</td>
              <td>
                <image-upload
                  v-model="item.data.image"
                  @update:modelValue="mediaImgChanged"
                />
              </td>
            </tr>
            <tr v-if="item.action === 'media'">
              <td>Sound:</td>
              <td>
                <sound-upload
                  v-model="item.data.sound"
                  :baseVolume="baseVolume"
                  @update:modelValue="mediaSndChanged"
                />
              </td>
            </tr>
            <tr v-if="item.action === 'media'">
              <td>Duration:</td>
              <td>
                <div class="control has-icons-left">
                  <duration-input
                    :modelValue="item.data.minDurationMs"
                    @update:modelValue="item.data.minDurationMs = $event"
                  />
                  <span class="icon is-small is-left">
                    <i class="fa fa-hourglass"></i>
                  </span>
                </div>
              </td>
            </tr>
            <tr v-if="item.action === 'countdown'">
              <td>Settings</td>
              <td>
                <countdown-editor
                  v-model="item.data"
                  :baseVolume="baseVolume"
                />
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
                        <input
                          type="text"
                          class="input is-small"
                          v-model="v.name"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          class="input is-small"
                          v-model="v.value"
                        />
                      </td>
                      <td>
                        <button
                          class="button is-small"
                          @click="rmVariable(idx)"
                        >
                          <i class="fa fa-remove" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <span class="button is-small" @click="onAddVariable"
                  >Add Variable</span
                >
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
                        <div class="dropdown is-active is-up">
                          <div class="dropdown-trigger">
                            <input
                              type="text"
                              class="input is-small"
                              v-model="v.name"
                              @focus="variableChangeFocusIdx = idx"
                              @blur="onVarChangeInputBlur"
                            />
                          </div>
                          <div
                            class="dropdown-menu"
                            id="dropdown-menu"
                            role="menu"
                            v-if="variableChangeFocusIdx === idx"
                          >
                            <div class="dropdown-content">
                              <a
                                class="dropdown-item"
                                v-for="(
                                  autocompleteVar, idx3
                                ) in autocompletableVariables(v.name)"
                                :key="idx3"
                                @click="v.name = autocompleteVar.var.name"
                              >
                                {{ autocompleteVar.var.name }} ({{
                                  autocompleteVar.type
                                }}, <code>{{ autocompleteVar.var.value }}</code
                                >)
                              </a>
                            </div>
                          </div>
                        </div>
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
                        <input
                          type="text"
                          class="input is-small"
                          v-model="v.value"
                        />
                      </td>
                      <td>
                        <button
                          class="button is-small"
                          @click="rmVariableChange(idx)"
                        >
                          <i class="fa fa-remove" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <span class="button is-small" @click="onAddVariableChange"
                  >Add Variable Change</span
                >
                <div class="help">
                  Variable changes are performed when the command is executed,
                  before anything else.
                </div>
              </td>
            </tr>
            <tr>
              <td>Permissions:</td>
              <td>
                <label>
                  <input
                    type="checkbox"
                    v-model="item.restrict_to"
                    value="broadcaster"
                  />
                  Broadcaster
                </label>
                <label>
                  <input
                    type="checkbox"
                    v-model="item.restrict_to"
                    value="mod"
                  />
                  Moderators
                </label>
                <label>
                  <input
                    type="checkbox"
                    v-model="item.restrict_to"
                    value="sub"
                  />
                  Subscribers
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer class="modal-card-foot">
        <button
          class="button is-small is-primary"
          :disabled="!valid"
          @click="onSaveClick"
        >
          Save changes
        </button>
        <button class="button is-small" @click="onCancelClick">Cancel</button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

import fn from "../../../common/fn";
import {
  Command,
  GlobalVariable,
  MediaFile,
  SoundMediaFile,
} from "../../../types";
import {
  ACTION_DESCRIPTION_MAP,
  ACTION_NAME_MAP,
  newText,
  newTrigger,
} from "../../../util";

interface ComponentDataLang {
  value: string;
  flag: string;
  title: string;
}

interface ComponentData {
  item: Command | null;
  variableChangeFocusIdx: number;
  dictLangs: ComponentDataLang[];
}

export default defineComponent({
  props: {
    modelValue: {
      type: Object,
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
    baseVolume: {
      default: 100,
    },
  },
  emits: ["update:modelValue", "cancel"],
  data: (): ComponentData => ({
    item: null,
    variableChangeFocusIdx: -1,
    dictLangs: [
      { value: "ja", flag: "🇯🇵", title: "Japanese" },
      { value: "ru", flag: "🇷🇺", title: "Russian" },
      { value: "de", flag: "🇩🇪", title: "German" },
      { value: "es", flag: "🇪🇸", title: "Spanish" },
      { value: "fr", flag: "🇫🇷", title: "French" },
      { value: "it", flag: "🇮🇹", title: "Italian" },
      { value: "pt", flag: "🇵🇹/🇧🇷", title: "Portuguese" },
    ],
  }),
  mounted() {
    this.item = JSON.parse(JSON.stringify(this.modelValue));
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
    addtxt() {
      if (!this.item) {
        console.warn("addtxt: this.item not initialized");
        return;
      }
      this.item.data.text.push(newText());
    },
    addtrigger(trigger: any) {
      if (!this.item) {
        console.warn("addtrigger: this.item not initialized");
        return;
      }
      this.item.triggers.push(newTrigger(trigger.type));
    },
    onAddVariableChange() {
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
    rmVariableChange(idx: number) {
      if (!this.item) {
        console.warn("rmVariableChange: this.item not initialized");
        return;
      }
      this.item.variableChanges = this.item.variableChanges.filter(
        (val, index) => index !== idx
      );
    },
    onAddVariable() {
      if (!this.item) {
        console.warn("onAddVariable: this.item not initialized");
        return;
      }
      this.item.variables.push({
        name: "",
        value: "",
      });
    },
    rmVariable(idx: number) {
      if (!this.item) {
        console.warn("rmVariable: this.item not initialized");
        return;
      }
      this.item.variables = this.item.variables.filter(
        (val, index) => index !== idx
      );
    },
    onSaveClick() {
      this.$emit("update:modelValue", this.item);
    },
    onCancelClick() {
      this.$emit("cancel");
    },
    onCloseClick() {
      this.$emit("cancel");
    },
    onOverlayClick() {
      this.$emit("cancel");
    },
    mediaSndChanged(file: SoundMediaFile) {
      if (!this.item) {
        console.warn("mediaSndChanged: this.item not initialized");
        return;
      }
      this.item.data.sound = file;
    },
    mediaImgChanged(file: MediaFile) {
      if (!this.item) {
        console.warn("mediaImgUploaded: this.item not initialized");
        return;
      }
      this.item.data.image = file;
    },
    rmtxt(idx: number) {
      if (!this.item) {
        console.warn("rmtxt: this.item not initialized");
        return;
      }
      this.item.data.text = this.item.data.text.filter(
        (val, index) => index !== idx
      );
    },
    rmtrigger(idx: number) {
      if (!this.item) {
        console.warn("rmtrigger: this.item not initialized");
        return;
      }
      this.item.triggers = this.item.triggers.filter(
        (val, index) => index !== idx
      );
    },
    autocompletableVariables(start: string) {
      if (!this.item) {
        console.warn("autocompletableVariables: this.item not initialized");
        return;
      }
      const variables = this.item.variables.slice().map((localVar) => {
        return {
          var: localVar,
          type: "local",
        };
      });
      this.globalVariables.forEach((globalVar) => {
        if (
          !variables.find((localVar) => localVar.var.name === globalVar.name)
        ) {
          variables.push({
            var: globalVar,
            type: "global",
          });
        }
      });
      return variables.filter((v) => v.var.name.startsWith(start)).slice(0, 10);
    },
    onVarChangeInputBlur() {
      setTimeout(() => {
        this.variableChangeFocusIdx = -1;
      }, 50);
    },
  },
  computed: {
    requiresAccessToken() {
      if (!this.item) {
        return false;
      }
      return (
        this.item.action === "set_channel_title" ||
        this.item.action === "set_channel_game_id" ||
        this.item.action === "add_stream_tags" ||
        this.item.action === "remove_stream_tags"
      );
    },
    possibleTriggerActions() {
      return [
        { type: "command", label: "Add Command", title: "Command" },
        {
          type: "reward_redemption",
          label: "Add Reward Redemption",
          title: "Reward Redemption",
        },
        { type: "timer", label: "Add Timer", title: "Timer" },
      ];
    },
    valid() {
      if (!this.item) {
        return false;
      }

      // check if all triggers are correct
      for (const trigger of this.item.triggers) {
        if (trigger.type === "command") {
          if (!trigger.data.command) {
            return false;
          }
        } else if (trigger.type === "timer") {
          try {
            fn.mustParseHumanDuration(trigger.data.minInterval);
          } catch (e) {
            return false;
          }
          const l = parseInt(`${trigger.data.minLines}`, 10);
          if (isNaN(l)) {
            return false;
          }
        }
      }

      // check if settings are correct
      if (this.item.action === "text") {
        for (const t of this.item.data.text) {
          if (t === "") {
            return false;
          }
        }
      }

      return true;
    },
    actionDescriptions() {
      return ACTION_DESCRIPTION_MAP;
    },
    title() {
      if (!this.item) {
        return "";
      }
      const verb = {
        create: "Create new ",
        edit: "Edit ",
      };
      return `${verb[this.mode]}${ACTION_NAME_MAP[this.item.action]}`;
    },
  },
});
</script>
<style scoped>
.textarea-holder {
  position: relative;
  padding-right: 2em;
}
.textarea-holder .button {
  position: absolute;
  right: -2px;
  top: 0;
}
</style>
