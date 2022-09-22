<template>
  <div>
    <div class="actions">
      <dropdown-button
        :actions="possibleActionsMapped"
        label="Add command"
        @click="add"
      />
      <div class="mr-1">
        Filter:
      </div>
      <div class="field has-addons mr-1 mb-0">
        <div class="control">
          <input
            v-model="filter.search"
            class="input is-small"
          >
        </div>
      </div>
      <div
        v-if="showFilterActions"
        class="field"
      >
        <label
          v-for="(a, idx) in possibleActionsWithCount"
          :key="idx"
          class="mr-1"
        ><input
          v-model="filter.actions"
          class="mr-1"
          type="checkbox"
          :value="a.action"
        >{{ a.action }} ({{ a.count }})</label>
      </div>
    </div>

    <div
      v-if="commands.length > 0"
      class="table-container"
    >
      <table
        ref="table"
        class="table is-striped"
      >
        <thead>
          <tr>
            <th />
            <th />
            <th>Trigger</th>
            <th>
              Response
              <label v-if="showToggleImages">
                <CheckboxInput
                  v-model="imagesVisible"
                  @update:model-value="onImageVisibleChange"
                />
                Show images
              </label>
            </th>
            <th>Type</th>
            <th>Permissions</th>
            <th>Widgets</th>
            <th />
            <th />
          </tr>
        </thead>
        <vue-draggable
          :model-value="commands"
          tag="tbody"
          handle=".handle"
          item-key="id"
          @end="dragEnd"
        >
          <template #item="{ element, index }">
            <tr v-show="!filteredOut(element)">
              <td class="pt-4 handle">
                <i class="fa fa-arrows" />
              </td>
              <td class="pl-0 pr-0">
                <button
                  class="button is-small"
                  @click="edit(index)"
                >
                  <i class="fa fa-pencil" />
                </button>
              </td>
              <td class="col-triggers">
                <div
                  v-for="(trigger, idx2) in element.triggers"
                  :key="idx2"
                  class="spacerow"
                >
                  <trigger-info :trigger="trigger" />
                </div>
              </td>
              <td>
                <div v-if="element.action === 'text'">
                  <template
                    v-for="(txt, idx2) in element.data.text"
                    :key="idx2"
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
                    v-if="element.data.image.file || element.data.sound.file"
                    class="spacerow media-holder media-holder-inline"
                  >
                    <responsive-image
                      v-if="element.data.image.file && imagesVisible"
                      :src="element.data.image.urlpath"
                      :title="element.data.image.filename"
                      width="100px"
                      height="50px"
                      style="display: inline-block"
                    />
                    <code v-else-if="element.data.image.file">{{
                      element.data.image.filename
                    }}</code>

                    <i
                      v-if="element.data.image.file && element.data.sound.file"
                      class="fa fa-plus is-justify-content-center mr-2 ml-2"
                    />
                    <audio-player
                      :src="element.data.sound.urlpath"
                      :name="element.data.sound.filename"
                      :volume="element.data.sound.volume"
                      :base-volume="baseVolume"
                      class="button is-small is-justify-content-center"
                    />
                    <span
                      v-if="element.data.image.file && element.data.sound.file"
                      class="ml-2"
                    >for at least
                      <duration-display :value="element.data.minDurationMs" />
                    </span>
                    <span
                      v-else-if="element.data.image.file"
                      class="ml-2"
                    >for
                      <duration-display :value="element.data.minDurationMs" />
                    </span>
                  </div>
                </div>
                <div v-else-if="element.action === 'countdown'">
                  <div v-if="(element.data.type || 'auto') === 'auto'">
                    <code>{{ element.data.intro }}</code>
                    <span>→</span>
                    <code>{{ element.data.steps }}</code> ✕
                    <duration-display :value="element.data.interval" />
                    <span>→</span>
                    <code>{{ element.data.outro }}</code>
                  </div>
                  <div v-else>
                    <template
                      v-for="(a, idxActions) in element.data.actions"
                      :key="idxActions"
                    >
                      <duration-display
                        v-if="a.type === 'delay'"
                        :value="a.value"
                      />
                      <code v-if="a.type === 'text'">{{ a.value }}</code>
                      <code v-if="a.type === 'media'">
                        Media(<span v-if="a.value.image.file">{{
                          a.value.image.filename
                        }}</span><span v-if="a.value.image.file && a.value.sound.file">+</span><span v-if="a.value.sound.file">{{
                          a.value.sound.filename
                        }}</span>)
                      </code>
                      <span v-if="idxActions < element.data.actions.length - 1">→</span>
                    </template>
                  </div>
                </div>
                <div
                  v-else-if="actionDescription(element.action)"
                  v-html="actionDescription(element.action)"
                />
              </td>
              <td>
                {{ element.action }}
              </td>
              <td>
                {{ permissionsStr(element) }}
              </td>
              <td>
                <div v-if="element.action === 'media'">
                  <a
                    v-if="element.data.widgetIds.length === 0"
                    class="button is-small mr-1"
                    :href="`${widgetUrl}`"
                    target="_blank"
                  >Default widget</a>
                  <a
                    v-for="(id, idx) in element.data.widgetIds"
                    :key="idx"
                    class="button is-small mr-1"
                    :href="`${widgetUrl}?id=${encodeURIComponent(id)}`"
                    target="_blank"
                  >
                    <code>{{ id }}</code> Widget
                  </a>
                </div>
                <div v-else>
                  -
                </div>
              </td>
              <td class="pl-0 pr-0">
                <doubleclick-button
                  class="button is-small mr-1"
                  message="Are you sure?"
                  :timeout="1000"
                  @doubleclick="remove(index)"
                >
                  <i class="fa fa-trash" />
                </doubleclick-button>
                <button
                  class="button is-small"
                  @click="duplicate(index)"
                >
                  <i class="fa fa-clone" />
                </button>
              </td>
            </tr>
          </template>
        </vue-draggable>
      </table>
    </div>
    <div v-else>
      No commands set up
    </div>

    <text-command-editor
      v-if="editIdx !== null && editCommand && editCommand.action === 'text'"
      :global-variables="globalVariables"
      :channel-points-custom-rewards="channelPointsCustomRewards"
      :model-value="editCommand"
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      @update:modelValue="editedCommand"
      @cancel="editCommand = null"
    />

    <media-command-editor
      v-else-if="editIdx !== null && editCommand && editCommand.action === 'media'"
      :global-variables="globalVariables"
      :channel-points-custom-rewards="channelPointsCustomRewards"
      :model-value="editCommand"
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      :base-volume="baseVolume"
      :widget-url="widgetUrl"
      @update:modelValue="editedCommand"
      @cancel="editCommand = null"
    />

    <dict-lookup-command-editor
      v-else-if="editIdx !== null && editCommand && editCommand.action === 'dict_lookup'"
      :global-variables="globalVariables"
      :channel-points-custom-rewards="channelPointsCustomRewards"
      :model-value="editCommand"
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      @update:modelValue="editedCommand"
      @cancel="editCommand = null"
    />

    <madochan-createword-command-editor
      v-else-if="editIdx !== null && editCommand && editCommand.action === 'madochan_createword'"
      :global-variables="globalVariables"
      :channel-points-custom-rewards="channelPointsCustomRewards"
      :model-value="editCommand"
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      @update:modelValue="editedCommand"
      @cancel="editCommand = null"
    />

    <EmotesCommandEditor
      v-else-if="editIdx !== null && editCommand && editCommand.action === 'emotes'"
      :global-variables="globalVariables"
      :channel-points-custom-rewards="channelPointsCustomRewards"
      :model-value="(editCommand as EmotesCommand)"
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      :base-volume="baseVolume"
      @update:modelValue="editedCommand"
      @cancel="editCommand = null"
    />

    <CommandEditor
      v-else-if="editIdx !== null && editCommand"
      :global-variables="globalVariables"
      :channel-points-custom-rewards="channelPointsCustomRewards"
      :model-value="editCommand"
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      :base-volume="baseVolume"
      @update:modelValue="editedCommand"
      @cancel="editCommand = null"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Command, CommandAction, CommandTriggerType, EmotesCommand, GlobalVariable, RandomTextCommand } from "../../../types";
import { permissionsStr } from "../../../common/permissions";
import { commands } from "../../../common/commands";
import fn from "../../../common/fn";
import CommandEditor from "./CommandEditor.vue";
import EmotesCommandEditor from "./EmotesCommandEditor.vue";

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
    components: { CommandEditor, EmotesCommandEditor },
    props: {
        globalVariables: {
            type: Array as PropType<GlobalVariable[]>,
            required: true,
        },
        channelPointsCustomRewards: {
            type: Object as PropType<Record<string, string[]>>,
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
        widgetUrl: {
            type: String,
            required: false,
            default: "",
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
        possibleActionsWithCount() {
            return this.possibleActions
                .map((action) => {
                return {
                    action,
                    count: this.commandCount(action),
                };
            })
                .filter((a) => a.count > 0);
        },
    },
    created() {
        this.commands = JSON.parse(JSON.stringify(this.modelValue));
        this.imagesVisible = this.showImages;
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
            if (this.filter.actions.length > 0 &&
                !this.filter.actions.includes(item.action)) {
                return true;
            }
            if (!this.filter.search) {
                return false;
            }
            const search = this.filter.search.toLowerCase();
            // search in triggers:
            const foundInTriggers = item.triggers.find(trigger => {
                if (trigger.type === CommandTriggerType.COMMAND) {
                    return trigger.data.command.toLowerCase().indexOf(search) >= 0;
                }
                if (trigger.type === CommandTriggerType.REWARD_REDEMPTION) {
                    return trigger.data.command.toLowerCase().indexOf(search) >= 0;
                }
                return false;
            });
            if (foundInTriggers) {
                return false;
            }
            if (item.action === CommandAction.TEXT) {
                const foundInText = ((item as RandomTextCommand).data.text).find((text) => {
                    return text.toLowerCase().indexOf(search) >= 0;
                });
                if (foundInText) {
                    return false;
                }
            }
            return true;
        },
        permissionsStr(item: Command) {
            return permissionsStr(item.restrict_to);
        },
        remove(idx: number) {
            this.commands = this.commands.filter((_val, index: number) => index !== idx);
            this.emitChange();
        },
        add(mappedAction: any) {
            const type: CommandAction = mappedAction.type;
            this.editIdx = -1;
            this.editCommand = commands[type].NewCommand();
        },
        edit(idx: number) {
            this.editIdx = idx;
            this.editCommand = this.commands[idx];
        },
        duplicate(idx: number) {
            this.editIdx = -1;
            this.editCommand = JSON.parse(JSON.stringify(this.commands[idx]));
        },
        editedCommand(command: Command): void {
            if (this.editIdx === null) {
                return;
            }
            if (this.editIdx === -1) {
                // put new commands on top of the list
                this.commands.unshift(command);
            }
            else {
                // otherwise edit the edited command
                this.commands[this.editIdx] = command;
            }
            this.emitChange();
            this.editIdx = null;
            this.editCommand = null;
        },
        dragEnd(evt: {
            oldIndex: number;
            newIndex: number;
        }) {
            this.commands = fn.arrayMove(this.commands, evt.oldIndex, evt.newIndex);
            this.emitChange();
        },
        actionDescription(action: CommandAction) {
            return commands[action].Description();
        },
        actionName(action: CommandAction) {
            return commands[action].Name();
        },
    }
});
</script>

<style scoped>
.col-triggers {
  max-width: 200px;
}

.col-triggers>div:not(:last-child) {
  border-bottom: 1px solid #dbdbdb;
  padding-bottom: 0.25em;
  margin-bottom: 0.25em;
}

.actions {
  display: flex;
  align-items: center;
  position: sticky;
  top: 51px;
  background: white;
  z-index: 6;
  padding: 5px 0;
}
</style>
