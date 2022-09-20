<template>
  <div
    v-if="item"
    class="avatar-editor modal is-active"
  >
    <div
      class="modal-background"
      @click="onOverlayClick"
    />
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">
          Edit Avatar
        </p>
        <button
          class="delete"
          aria-label="close"
          @click="onCloseClick"
        />
      </header>
      <section
        ref="cardBody"
        class="modal-card-body"
      >
        <div class="columns">
          <div class="column is-three-quarters">
            <table class="table is-striped">
              <tbody>
                <tr>
                  <td>Name:</td>
                  <td>
                    <input
                      v-model="item.name"
                      class="input is-small"
                    >
                  </td>
                </tr>
                <tr>
                  <td>Dimensions:</td>
                  <td>
                    <input
                      v-model="item.width"
                      class="input is-small number-input"
                    >✖<input
                      v-model="item.height"
                      class="input is-small number-input"
                    >
                    Pixels
                    <span
                      v-if="allImages.length"
                      class="button is-small"
                      @click="autoDetectDimensions"
                    >Auto-detect</span>
                  </td>
                </tr>
                <tr>
                  <td>States:</td>
                  <td>
                    <span
                      v-for="(stateDef, idx) in item.stateDefinitions"
                      :key="idx"
                      class="tag"
                    >
                      <span>{{ stateDef.value }}</span>
                      <span
                        v-if="stateDef.deletable"
                        class="ml-1 is-clickable"
                        @click="removeStateDefinition(idx)"
                      ><i
                        class="fa fa-trash"
                      /></span>
                    </span>

                    <StringInput
                      v-model="newState"
                      placeholder="State"
                    />
                    <span
                      class="button is-small"
                      :disabled="isStateAddable ? undefined : true"
                      @click="addStateDefinition"
                    >Add custom state</span>
                  </td>
                </tr>
                <tr>
                  <td>Slots</td>
                  <td>
                    <avatar-slot-definition-editor
                      v-for="(slotDefinition, idx) in item.slotDefinitions"
                      :key="idx"
                      class="card mb-2"
                      :model-value="slotDefinition"
                      :avatar-def="item"
                      @update:modelValue="updateSlotDefinition(idx, $event)"
                      @moveUp="moveSlotUp(idx)"
                      @moveDown="moveSlotDown(idx)"
                      @remove="removeSlotDefinition(idx)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <span
              class="button is-small"
              @click="addSlotDefinition"
            >Add slot</span>
          </div>
          <div class="column">
            <div>JSON:</div>
            <textarea
              v-model="itemStr"
              class="textarea mb-2"
            />
            <div>All images in use:</div>
            <div
              ref="allImagesDiv"
              class="avatar-all-images"
            >
              <img
                v-for="(img, idx) in allImages"
                :key="idx"
                :src="img"
                draggable="true"
                class="mr-1 mb-1"
                :data-src="img"
                @dragstart="imageDragStart"
              >
            </div>
          </div>
        </div>
      </section>
      <footer class="modal-card-foot">
        <button
          class="button is-small is-primary"
          @click="onSaveClick"
        >
          Save
        </button>
        <button
          class="button is-small is-primary"
          @click="onSaveAndCloseClick"
        >
          Save and close
        </button>
        <button
          class="button is-small"
          @click="onCancelClick"
        >
          Cancel
        </button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { arraySwap } from "../../../common/fn";
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleAvatarStateDefinition,
  default_avatar_definition,
} from "../../../mod/modules/AvatarModuleCommon";
import StringInput from "../StringInput.vue";

interface ComponentData {
  item: AvatarModuleAvatarDefinition | null;
  itemStr: string;
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
        itemStr: "null",
        newState: "",
        newSlotDefinitionName: "",
    }),
    computed: {
        cardBody(): HTMLElement | null {
            if (!this.$refs.cardBody) {
                return null;
            }
            return this.$refs.cardBody as HTMLElement;
        },
        allImagesDiv(): HTMLDivElement | null {
            if (!this.$refs.allImagesDiv) {
                return null;
            }
            return this.$refs.allImagesDiv as HTMLDivElement;
        },
        allImages() {
            const images: string[] = [];
            this.item?.slotDefinitions.forEach((slotDef) => {
                slotDef.items.forEach((item) => {
                    item.states.forEach((state) => {
                        state.frames.forEach((frame) => {
                            if (frame.url && !images.includes(frame.url)) {
                                images.push(frame.url);
                            }
                        });
                    });
                });
            });
            return images;
        },
        isStateAddable() {
            if (!this.item) {
                return false;
            }
            if (this.newState === "" ||
                this.item.stateDefinitions.find(({ value }) => value === this.newState)) {
                return false;
            }
            return true;
        },
    },
    watch: {
        modelValue: {
            handler(v) {
                this.item = JSON.parse(this.itemStr);
            },
        },
        item: {
            handler(v) {
                this.itemStr = JSON.stringify(v);
            },
            deep: true,
        },
        itemStr: {
            handler(v) {
                const current = JSON.stringify(this.item);
                try {
                    const updated = JSON.parse(v);
                    if (current !== updated) {
                        this.item = updated;
                    }
                }
                catch (e) {
                    console.warn(e);
                }
            },
        },
    },
    mounted() {
        this.itemStr = JSON.stringify(this.modelValue);
        this.item = JSON.parse(this.itemStr);
        this.adjustAllImagesDivSize();
        window.addEventListener("resize", this.adjustAllImagesDivSize);
    },
    unmounted() {
        window.removeEventListener("resize", this.adjustAllImagesDivSize);
    },
    methods: {
        autoDetectDimensions(): void {
            if (this.allImages.length === 0) {
                return;
            }
            const img = new Image();
            img.onload = () => {
                if (!this.item) {
                    return;
                }
                this.item.width = img.width;
                this.item.height = img.height;
            };
            img.src = this.allImages[0];
        },
        adjustAllImagesDivSize(): void {
            this.$nextTick(() => {
                if (!this.cardBody || !this.allImagesDiv) {
                    return;
                }
                const maxHeight = this.cardBody.clientHeight;
                this.allImagesDiv.style.maxHeight = `${maxHeight}px`;
            });
        },
        imageDragStart($evt: DragEvent): void {
            if (!$evt.dataTransfer) {
                return;
            }
            const element = $evt.target as HTMLImageElement;
            const url = element.getAttribute("data-src");
            if (!url) {
                return;
            }
            $evt.dataTransfer.setData("avatar-image-url", url);
        },
        emitUpdate(): void {
            if (!this.item) {
                console.warn("emitUpdate: this.item not initialized");
                return;
            }
            this.$emit("update:modelValue", default_avatar_definition({
                name: this.item.name,
                width: parseInt(`${this.item.width}`, 10),
                height: parseInt(`${this.item.height}`, 10),
                stateDefinitions: this.item.stateDefinitions,
                slotDefinitions: this.item.slotDefinitions,
                state: this.item.state,
            }));
        },
        onSaveClick(): void {
            this.emitUpdate();
        },
        onSaveAndCloseClick(): void {
            this.emitUpdate();
            this.$emit("cancel");
        },
        onCancelClick(): void {
            this.$emit("cancel");
        },
        onOverlayClick(): void {
            this.$emit("cancel");
        },
        onCloseClick(): void {
            this.$emit("cancel");
        },
        addStateDefinition(): void {
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
        removeStateDefinition(index: string | number): void {
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
            const stateStrings = stateDefinitions.map((stateDefinition) => stateDefinition.value);
            for (let slotDef of this.item.slotDefinitions) {
                for (let item of slotDef.items) {
                    item.states = item.states.filter((anim) => stateStrings.includes(anim.state));
                }
            }
        },
        removeSlotDefinition(index: string | number): void {
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
        updateSlotDefinition(index: string | number, slotDefinition: AvatarModuleAvatarSlotDefinition): void {
            if (!this.item) {
                console.warn("updateSlotDefinition: this.item not initialized");
                return;
            }
            this.item.slotDefinitions[parseInt(`${index}`, 10)] = slotDefinition;
        },
        addSlotDefinition(): void {
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
        moveSlotUp(idx: number): void {
            this.swapItems(idx - 1, idx);
        },
        moveSlotDown(idx: number): void {
            this.swapItems(idx + 1, idx);
        },
        swapItems(idx1: number, idx2: number): void {
            if (!this.item) {
                console.warn("swapItems: this.item not initialized");
                return;
            }
            arraySwap(this.item.slotDefinitions, idx1, idx2);
        },
    },
    components: { StringInput }
});
</script>
