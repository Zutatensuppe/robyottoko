<template>
  <div class="avatar-editor modal is-active" v-if="item">
    <div class="modal-background" @click="onOverlayClick"></div>
    <div class="modal-card" style="width: auto">
      <header class="modal-card-head">
        <p class="modal-card-title">Edit Avatar</p>
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
              <td>Name:</td>
              <td><input class="input is-small" v-model="item.name" /></td>
            </tr>
            <tr>
              <td>States:</td>
              <td>
                <span
                  class="tag"
                  v-for="(stateDef, idx) in item.stateDefinitions"
                  :key="idx"
                >
                  <span>{{ stateDef.value }}</span>
                  <span
                    class="ml-1 is-clickable"
                    v-if="stateDef.deletable"
                    @click="removeStateDefinition(idx)"
                    ><i class="fa fa-trash"></i
                  ></span>
                </span>

                <input
                  class="input is-small"
                  type="text"
                  v-model="newState"
                  placeholder="State"
                />
                <span
                  class="button is-small"
                  @click="addStateDefinition"
                  :disabled="isStateAddable ? null : true"
                  >Add custom state</span
                >
              </td>
            </tr>
            <tr>
              <td>Slots</td>
              <td>
                <avatar-slot-definition-editor
                  class="card mb-2"
                  v-for="(slotDefinition, idx) in item.slotDefinitions"
                  :key="idx"
                  :modelValue="slotDefinition"
                  :avatarDef="item"
                  @update:modelValue="updateSlotDefinition(idx, $event)"
                  @moveUp="moveSlotUp(idx)"
                  @moveDown="moveSlotDown(idx)"
                  @remove="removeSlotDefinition(idx)"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <span class="button is-small" @click="addSlotDefinition">Add slot</span>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-small is-primary" @click="onSaveClick">
          Save
        </button>
        <button class="button is-small is-primary" @click="onSaveAndCloseClick">
          Save and close
        </button>
        <button class="button is-small" @click="onCancelClick">Cancel</button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleAvatarStateDefinition,
} from "../../../mod/modules/AvatarModule";

interface ComponentData {
  item: AvatarModuleAvatarDefinition | null;
  newState: string;
  newSlotDefinitionName: string;
}
export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<AvatarModuleAvatarDefinition>,
      required: true,
    },
  },
  emits: ["update:modelValue", "cancel"],
  data: (): ComponentData => ({
    item: null,

    newState: "",
    newSlotDefinitionName: "",
  }),
  mounted() {
    this.item = JSON.parse(JSON.stringify(this.modelValue));
  },
  watch: {
    modelValue: {
      handler(v) {
        this.item = JSON.parse(JSON.stringify(v));
      },
    },
  },
  computed: {
    isStateAddable() {
      if (!this.item) {
        return false;
      }
      if (
        this.newState === "" ||
        this.item.stateDefinitions.find(({ value }) => value === this.newState)
      ) {
        return false;
      }
      return true;
    },
  },
  methods: {
    onSaveClick() {
      if (!this.item) {
        console.warn("onSaveClick: this.item not initialized");
        return;
      }
      this.$emit("update:modelValue", {
        name: this.item.name,
        stateDefinitions: this.item.stateDefinitions,
        slotDefinitions: this.item.slotDefinitions,
      });
    },
    onSaveAndCloseClick() {
      if (!this.item) {
        console.warn("onSaveClick: this.item not initialized");
        return;
      }
      this.$emit("update:modelValue", {
        name: this.item.name,
        stateDefinitions: this.item.stateDefinitions,
        slotDefinitions: this.item.slotDefinitions,
      });
      this.$emit("cancel");
    },
    onCancelClick() {
      this.$emit("cancel");
    },
    onOverlayClick() {
      this.$emit("cancel");
    },
    onCloseClick() {
      this.$emit("cancel");
    },
    addStateDefinition() {
      if (!this.item) {
        console.warn("addStateDefinition: this.item not initialized");
        return;
      }
      const stateDefinition: AvatarModuleAvatarStateDefinition = {
        value: this.newState,
        deletable: true,
      };
      this.item.stateDefinitions.push(stateDefinition);
      for (let slotDef of this.item.slotDefinitions) {
        for (let item of slotDef.items) {
          item.states.push({
            state: stateDefinition.value,
            frames: [],
          });
        }
      }
    },
    removeStateDefinition(index: string | number) {
      if (!this.item) {
        console.warn("removeStateDefinition: this.item not initialized");
        return;
      }
      const stateDefinitions: AvatarModuleAvatarStateDefinition[] = [];
      for (let idx in this.item.stateDefinitions) {
        if (parseInt(idx, 10) === parseInt(`${index}`, 10)) {
          continue;
        }
        stateDefinitions.push(this.item.stateDefinitions[idx]);
      }
      this.item.stateDefinitions = stateDefinitions;
      const stateStrings = stateDefinitions.map(
        (stateDefinition) => stateDefinition.value
      );
      for (let slotDef of this.item.slotDefinitions) {
        for (let item of slotDef.items) {
          item.states = item.states.filter((anim) =>
            stateStrings.includes(anim.state)
          );
        }
      }
    },
    removeSlotDefinition(index: string | number) {
      if (!this.item) {
        console.warn("removeSlotDefinition: this.item not initialized");
        return;
      }
      const slotDefinitions: AvatarModuleAvatarSlotDefinition[] = [];
      for (let idx in this.item.slotDefinitions) {
        if (parseInt(idx, 10) === parseInt(`${index}`, 10)) {
          continue;
        }
        slotDefinitions.push(this.item.slotDefinitions[idx]);
      }
      this.item.slotDefinitions = slotDefinitions;
    },
    updateSlotDefinition(
      index: string | number,
      slotDefinition: AvatarModuleAvatarSlotDefinition
    ) {
      if (!this.item) {
        console.warn("updateSlotDefinition: this.item not initialized");
        return;
      }
      this.item.slotDefinitions[parseInt(`${index}`, 10)] = slotDefinition;
    },
    addSlotDefinition() {
      if (!this.item) {
        console.warn("addSlotDefinition: this.item not initialized");
        return;
      }
      const slotDefinition: AvatarModuleAvatarSlotDefinition = {
        slot: "Unnamed slot",
        defaultItemIndex: -1,
        items: [],
      };
      this.item.slotDefinitions.push(slotDefinition);
    },
    moveSlotUp(idx: number) {
      if (!this.item) {
        console.warn("moveSlotUp: this.item not initialized");
        return;
      }
      if (idx <= 0) {
        return;
      }
      const tmp = this.item.slotDefinitions[idx - 1];
      this.item.slotDefinitions[idx - 1] = this.item.slotDefinitions[idx];
      this.item.slotDefinitions[idx] = tmp;
    },
    moveSlotDown(idx: number) {
      if (!this.item) {
        console.warn("moveSlotDown: this.item not initialized");
        return;
      }
      if (idx >= this.item.slotDefinitions.length - 1) {
        return;
      }
      const tmp = this.item.slotDefinitions[idx + 1];
      this.item.slotDefinitions[idx + 1] = this.item.slotDefinitions[idx];
      this.item.slotDefinitions[idx] = tmp;
    },
  },
});
</script>
