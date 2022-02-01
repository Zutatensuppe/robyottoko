<template>
  <div>
    <div class="actions">
      <dropdown-button
        :actions="possibleActionsMapped"
        label="Add command"
        @click="add"
      />
      <div class="mr-1">Filter:</div>
      <div class="field has-addons mr-1 mb-0">
        <div class="control">
          <input class="input is-small" v-model="filter.search" />
        </div>
      </div>
      <div class="field" v-if="showFilterActions">
        <label class="mr-1" v-for="(action, idx) in possibleActions" :key="idx"
          ><input
            class="mr-1"
            type="checkbox"
            :value="action"
            v-model="filter.actions"
          />{{ action }} ({{ commandCount(action) }})</label
        >
      </div>
    </div>

    <div class="table-container" v-if="commands.length > 0">
      <table class="table is-striped" ref="table">
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th>Trigger</th>
            <th>
              Response
              <label v-if="showToggleImages">
                <input
                  type="checkbox"
                  v-model="imagesVisible"
                  @update:modelValue="onImageVisibleChange"
                />
                Show images
              </label>
            </th>
            <th>Type</th>
            <th>Permissions</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <draggable
          :modelValue="commands"
          @end="dragEnd"
          tag="tbody"
          handle=".handle"
          item-key="id"
        >
          <template #item="{ element, index }">
            <tr v-show="!filteredOut(element)">
              <td class="pt-4 handle">
                <i class="fa fa-arrows"></i>
              </td>
              <td class="pl-0 pr-0">
                <button class="button is-small" @click="edit(index)">
                  <i class="fa fa-pencil" />
                </button>
              </td>
              <td class="col-triggers">
                <div
                  v-for="(trigger, idx2) in element.triggers"
                  :key="idx2"
                  class="spacerow"
                >
                  <div v-if="element.triggers[idx2].type === 'command'">
                    <code>{{ element.triggers[idx2].data.command }}</code>
                  </div>
                  <div
                    v-if="element.triggers[idx2].type === 'reward_redemption'"
                  >
                    <span class="is-small" title="Channel Point Reward"
                      ><i class="fa fa-bullseye"></i>:
                    </span>
                    <code>{{ element.triggers[idx2].data.command }}</code>
                  </div>
                  <div v-if="element.triggers[idx2].type === 'timer'">
                    <span class="is-small">Timer: </span>
                    <code
                      >{{ element.triggers[idx2].data.minLines }} lines,
                      <duration
                        :value="element.triggers[idx2].data.minInterval"
                    /></code>
                  </div>
                </div>
              </td>
              <td>
                <div v-if="element.action === 'text'">
                  <template
                    v-for="(txt, idx2) in element.data.text"
                    :key="idx2"
                    class="field has-addons"
                  >
                    <code>{{ element.data.text[idx2] }}</code>
                    <span v-if="idx2 < element.data.text.length - 1">or</span>
                  </template>
                </div>
                <div
                  v-else-if="element.action === 'media'"
                  :class="element.action"
                >
                  <div
                    class="spacerow media-holder media-holder-inline"
                    v-if="element.data.image.file || element.data.sound.file"
                  >
                    <responsive-image
                      v-if="element.data.image.file && imagesVisible"
                      :src="element.data.image.file"
                      :title="element.data.image.filename"
                      width="100px"
                      height="50px"
                      style="display: inline-block"
                    />
                    <code v-else-if="element.data.image.file">{{
                      element.data.image.filename
                    }}</code>

                    <i
                      class="fa fa-plus is-justify-content-center mr-2 ml-2"
                      v-if="element.data.image.file && element.data.sound.file"
                    />
                    <player
                      :src="element.data.sound.file"
                      :name="element.data.sound.filename"
                      :volume="element.data.sound.volume"
                      :baseVolume="baseVolume"
                      class="button is-small is-justify-content-center"
                    />
                    <span
                      class="ml-2"
                      v-if="element.data.image.file && element.data.sound.file"
                      >for at least
                      <duration :value="element.data.minDurationMs"
                    /></span>
                    <span class="ml-2" v-else-if="element.data.image.file"
                      >for <duration :value="element.data.minDurationMs"
                    /></span>
                  </div>
                </div>
                <div v-else-if="element.action === 'countdown'">
                  <div v-if="(element.data.type || 'auto') === 'auto'">
                    <code>{{ element.data.intro }}</code>
                    <span>→</span>
                    <code>{{ element.data.steps }}</code> ✕
                    <duration :value="element.data.interval" />
                    <span>→</span>
                    <code>{{ element.data.outro }}</code>
                  </div>
                  <div v-else>
                    <template
                      v-for="(a, idxActions) in element.data.actions"
                      :key="idxActions"
                    >
                      <duration v-if="a.type === 'delay'" :value="a.value" />
                      <code v-if="a.type === 'text'">{{ a.value }}</code>
                      <code v-if="a.type === 'media'">
                        Media(<span v-if="a.value.image.file">{{
                          a.value.image.filename
                        }}</span
                        ><span v-if="a.value.image.file && a.value.sound.file"
                          >+</span
                        ><span v-if="a.value.sound.file">{{
                          a.value.sound.filename
                        }}</span
                        >)
                      </code>
                      <span v-if="idxActions < element.data.actions.length - 1"
                        >→</span
                      >
                    </template>
                  </div>
                </div>
                <div
                  v-else-if="actionDescriptions[element.action]"
                  v-html="actionDescriptions[element.action]"
                ></div>
              </td>
              <td>
                {{ element.action }}
              </td>
              <td>
                {{ permissionsStr(element) }}
              </td>
              <td class="pl-0 pr-0">
                <doubleclick-button
                  class="button is-small mr-1"
                  message="Are you sure?"
                  :timeout="1000"
                  @doubleclick="remove(index)"
                  ><i class="fa fa-trash"
                /></doubleclick-button>
                <button class="button is-small" @click="duplicate(index)">
                  <i class="fa fa-clone" />
                </button>
              </td>
            </tr>
          </template>
        </draggable>
      </table>
    </div>
    <div v-else>No commands set up</div>

    <command-editor
      v-if="editCommand"
      :globalVariables="globalVariables"
      :modelValue="editCommand"
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      :baseVolume="baseVolume"
      @update:modelValue="editedCommand"
      @cancel="editCommand = null"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Command, CommandAction, GlobalVariable } from "../../../types";
import { ACTION_DESCRIPTION_MAP, ACTION_NAME_MAP, newCmd } from "../../../util";
import fn from "../../../common/fn";

interface ComponentData {
  commands: Command[];
  editIdx: number | null;
  editCommand: Command | null;
  filter: {
    search: string;
    actions: string[];
  };
  imagesVisible: boolean;
}

export default defineComponent({
  props: {
    globalVariables: {
      type: Array as PropType<GlobalVariable[]>,
      required: true,
    },
    possibleActions: {
      type: Array as PropType<CommandAction[]>,
      required: true,
    },
    baseVolume: {
      type: Number,
      required: true,
    },
    modelValue: {
      type: Array as PropType<Command[]>,
      required: true,
    },
    showToggleImages: {
      type: Boolean,
      required: false,
      default: false,
    },
    showFilterActions: {
      type: Boolean,
      required: false,
      default: false,
    },
    showImages: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  emits: ["update:modelValue", "showImagesChange"],
  data(): ComponentData {
    return {
      commands: [],
      editIdx: null,
      editCommand: null,
      filter: {
        search: "",
        actions: [],
      },
      imagesVisible: false,
    };
  },
  computed: {
    possibleActionsMapped() {
      return this.possibleActions.map((action) => ({
        type: action,
        title: this.actionDescription(action),
        label: `Add ${this.actionName(action)}`,
      }));
    },
    actionDescriptions() {
      return ACTION_DESCRIPTION_MAP;
    },
  },
  methods: {
    onImageVisibleChange() {
      // TODO: use value from event?
      this.$emit("showImagesChange", this.imagesVisible);
    },
    emitChange() {
      this.$emit("update:modelValue", this.commands);
    },
    commandCount(action: string): number {
      let count = 0;
      for (const cmd of this.commands) {
        if (cmd.action === action) {
          count++;
        }
      }
      return count;
    },
    filteredOut(item: Command) {
      if (
        this.filter.actions.length > 0 &&
        !this.filter.actions.includes(item.action)
      ) {
        return true;
      }
      if (!this.filter.search) {
        return false;
      }
      const search = this.filter.search.toLowerCase();
      return !item.triggers.find(
        ({ type, data }) =>
          type === "command" && data.command.toLowerCase().indexOf(search) >= 0
      );
    },
    permissionsStr(item: Command) {
      if (!item.restrict_to || item.restrict_to.length === 0) {
        return "Everyone";
      }
      const parts = [];
      if (item.restrict_to.includes("broadcaster")) {
        parts.push("Broadcaster");
      }
      if (item.restrict_to.includes("mod")) {
        parts.push("Moderators");
      }
      if (item.restrict_to.includes("sub")) {
        parts.push("Subscribers");
      }
      return parts.join(", ");
    },
    remove(idx: number) {
      this.commands = this.commands.filter((val, index) => index !== idx);
      this.emitChange();
    },
    add(mappedAction: any) {
      const cmd = newCmd(mappedAction.type);
      if (!cmd) {
        return;
      }
      this.editIdx = this.commands.length;
      this.editCommand = cmd;
    },
    edit(idx: number) {
      this.editIdx = idx;
      this.editCommand = this.commands[idx];
    },
    duplicate(idx: number) {
      this.editIdx = this.commands.length;
      this.editCommand = JSON.parse(JSON.stringify(this.commands[idx]));
    },
    editedCommand(command: Command): void {
      if (this.editIdx === null) {
        return;
      }
      this.commands[this.editIdx] = command;
      this.emitChange();
      this.editIdx = null;
      this.editCommand = null;
    },
    dragEnd(evt: { oldIndex: number; newIndex: number }) {
      this.commands = fn.arrayMove(this.commands, evt.oldIndex, evt.newIndex);
      this.emitChange();
    },
    actionDescription(action: CommandAction) {
      return ACTION_DESCRIPTION_MAP[action];
    },
    actionName(action: CommandAction) {
      return ACTION_NAME_MAP[action];
    },
  },
  created() {
    this.commands = JSON.parse(JSON.stringify(this.modelValue));
    this.imagesVisible = this.showImages;
  },
});
</script>

<style scoped>
.col-triggers {
  max-width: 200px;
}
.col-triggers > div:not(:last-child) {
  border-bottom: 1px solid #dbdbdb;
  padding-bottom: 0.25em;
  margin-bottom: 0.25em;
}
.actions {
  display: flex;
  align-items: center;
}
</style>
