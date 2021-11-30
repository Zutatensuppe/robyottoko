<template>
  <div class="avatar-editor columns">
    <div class="column">
      <div>
        <strong>Avatar: {{ modelValue.name }}</strong>
      </div>
      <div>
        <strong>States:</strong>
        <div v-for="(stateDef, idx) in modelValue.stateDefinitions" :key="idx">
          <code>{{ stateDef.value }}</code>
          <span
            v-if="stateDef.deletable"
            class="button is-small"
            @click="removeStateDefinition(idx)"
            ><i class="fa fa-trash"></i
          ></span>
        </div>

        <input
          class="input is-small"
          type="text"
          v-model="newState"
          placeholder="Slot"
        />
        <span
          class="button is-small"
          @click="addStateDefinition"
          :disabled="newState === '' ? true : null"
          >Add custom state</span
        >
      </div>
      <div>
        <strong>Slots:</strong>
        <avatar-slot-definition-editor
          v-for="(slotDefinition, idx) in modelValue.slotDefinitions"
          :key="idx"
          :modelValue="slotDefinition"
          :avatarDef="modelValue"
          @update:modelValue="updateSlotDefinition(idx, $event)"
          @remove="removeSlotDefinition(idx)"
        />
      </div>

      <input
        class="input is-small"
        type="text"
        v-model="newSlotDefinitionName"
        placeholder="Slot"
      />
      <span class="button is-small" @click="addSlotDefinition"
        >Add slot definition</span
      >
    </div>
    <div class="column">
      <hr />
      AVATAR DBG:
      <pre>{{ modelValue }}</pre>

      <hr />

      AVATAR PREVIEW:
      <div style="border: solid 2px">
        <!-- <avatar-preview :avatar="modelValue" /> -->
      </div>
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

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<AvatarModuleAvatarDefinition>,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  data: () => ({
    newState: "",
    newSlotDefinitionName: "",
  }),
  methods: {
    emitChange() {
      this.$emit("update:modelValue", {
        name: this.modelValue.name,
        stateDefinitions: this.modelValue.stateDefinitions,
        slotDefinitions: this.modelValue.slotDefinitions,
      });
    },
    addStateDefinition() {
      const stateDefinition: AvatarModuleAvatarStateDefinition = {
        value: this.newState,
        deletable: true,
      };
      this.modelValue.stateDefinitions.push(stateDefinition);
      for (let slotDef of this.modelValue.slotDefinitions) {
        for (let item of slotDef.items) {
          item.states.push({
            state: stateDefinition.value,
            frames: [],
          });
        }
      }
      this.emitChange();
    },
    removeStateDefinition(index) {
      const stateDefinitions: AvatarModuleAvatarStateDefinition[] = [];
      for (let idx in this.modelValue.stateDefinitions) {
        if (parseInt(idx, 10) === parseInt(index, 10)) {
          continue;
        }
        stateDefinitions.push(this.modelValue.stateDefinitions[idx]);
      }
      this.modelValue.stateDefinitions = stateDefinitions;
      const stateStrings = stateDefinitions.map(
        (stateDefinition) => stateDefinition.value
      );
      for (let slotDef of this.modelValue.slotDefinitions) {
        for (let item of slotDef.items) {
          item.states = item.states.filter((anim) =>
            stateStrings.includes(anim.state)
          );
        }
      }
      this.emitChange();
    },
    removeSlotDefinition(index) {
      const slotDefinitions: AvatarModuleAvatarSlotDefinition[] = [];
      for (let idx in this.modelValue.slotDefinitions) {
        if (parseInt(idx, 10) === parseInt(index, 10)) {
          continue;
        }
        slotDefinitions.push(this.modelValue.slotDefinitions[idx]);
      }
      this.modelValue.slotDefinitions = slotDefinitions;
      this.emitChange();
    },
    updateSlotDefinition(
      index,
      slotDefinition: AvatarModuleAvatarSlotDefinition
    ) {
      this.modelValue.slotDefinitions[parseInt(index, 10)] = slotDefinition;
      this.emitChange();
    },
    addSlotDefinition() {
      const slotDefinition: AvatarModuleAvatarSlotDefinition = {
        slot: this.newSlotDefinitionName,
        defaultItemIndex: -1,
        items: [],
      };
      this.modelValue.slotDefinitions.push(slotDefinition);
      this.emitChange();
    },
  },
});
</script>
