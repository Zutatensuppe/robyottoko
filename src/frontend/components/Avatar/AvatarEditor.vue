<template>
  <div class="avatar-editor modal is-active">
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
                      v-model="val.name"
                      class="input is-small"
                    >
                  </td>
                </tr>
                <tr>
                  <td>Dimensions:</td>
                  <td>
                    <input
                      v-model="val.width"
                      class="input is-small number-input"
                    >✖<input
                      v-model="val.height"
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
                      v-for="(stateDef, idx) in val.stateDefinitions"
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
                    <AvatarSlotDefinitionEditor
                      v-for="(slotDefinition, idx) in val.slotDefinitions"
                      :key="idx"
                      class="card mb-2"
                      :model-value="slotDefinition"
                      :avatar-def="val"
                      @update:model-value="updateSlotDefinition(idx, $event)"
                      @move-up="moveSlotUp(idx)"
                      @move-down="moveSlotDown(idx)"
                      @remove="removeSlotDefinition(idx)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <span
              class="button is-small ml-3"
              @click="addSlotDefinition"
            >Add slot</span>
          </div>
          <div class="column">
            <div>JSON:</div>
            <textarea
              v-model="currentValJson"
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

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, Ref, watch } from 'vue'
import { arraySwap } from '../../../common/fn'
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleAvatarStateDefinition,
  default_avatar_definition,
} from '../../../mod/modules/AvatarModuleCommon'
import StringInput from '../StringInput.vue'
import AvatarSlotDefinitionEditor from './AvatarSlotDefinitionEditor.vue'

const props = defineProps<{
  modelValue: AvatarModuleAvatarDefinition,
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: AvatarModuleAvatarDefinition): void,
  (e: 'cancel'): void,
}>()

const val = ref<AvatarModuleAvatarDefinition>(JSON.parse(JSON.stringify(props.modelValue)))
const currentValJson = computed(() => JSON.stringify(val.value))

const newState = ref<string>('')
const cardBody = ref<HTMLElement>() as Ref<HTMLElement>
const allImagesDiv = ref<HTMLDivElement>() as Ref<HTMLDivElement>

const allImages = computed(() => {
  const images: string[] = []
  val.value.slotDefinitions.forEach((slotDef) => {
    slotDef.items.forEach((item) => {
      item.states.forEach((state) => {
        state.frames.forEach((frame) => {
          if (frame.url && !images.includes(frame.url)) {
            images.push(frame.url)
          }
        })
      })
    })
  })
  return images
})

const stateExists = (state: string): boolean => {
  return val.value.stateDefinitions.some(({ value }) => value === state)
}

const isStateAddable = computed((): boolean => {
  return newState.value !== '' && !stateExists(newState.value)
})

const adjustAllImagesDivSize = () => {
  nextTick(() => {
    const maxHeight = cardBody.value.clientHeight
    allImagesDiv.value.style.maxHeight = `${maxHeight}px`
  })
}

const autoDetectDimensions = (): void => {
  if (allImages.value.length === 0) {
    return
  }
  const img = new Image()
  img.onload = () => {
    val.value.width = img.width
    val.value.height = img.height
  }
  img.src = allImages.value[0]
}

const imageDragStart = ($evt: DragEvent): void => {
  if (!$evt.dataTransfer) {
    return
  }
  const element = $evt.target as HTMLImageElement
  const url = element.getAttribute('data-src')
  if (!url) {
    return
  }
  $evt.dataTransfer.setData('avatar-image-url', url)
}

const emitUpdate = (): void => {
  emit('update:modelValue', default_avatar_definition({
    name: val.value.name,
    width: parseInt(`${val.value.width}`, 10),
    height: parseInt(`${val.value.height}`, 10),
    stateDefinitions: val.value.stateDefinitions,
    slotDefinitions: val.value.slotDefinitions,
    state: val.value.state,
  }))
}

const onSaveClick = (): void => {
  emitUpdate()
}
const onSaveAndCloseClick = (): void => {
  emitUpdate()
  emit('cancel')
}
const onCancelClick = (): void => {
  emit('cancel')
}
const onOverlayClick = (): void => {
  emit('cancel')
}
const onCloseClick = (): void => {
  emit('cancel')
}

const addStateDefinition = (): void => {
  const stateDefinition: AvatarModuleAvatarStateDefinition = {
    value: newState.value,
    deletable: true,
  }
  val.value.stateDefinitions.push(stateDefinition)
  for (const slotDef of val.value.slotDefinitions) {
    for (const item of slotDef.items) {
      item.states.push({
        state: stateDefinition.value,
        frames: [],
      })
    }
  }
}

const removeStateDefinition = (index: string | number): void => {
  const stateDefinitions: AvatarModuleAvatarStateDefinition[] = []
  for (const idx in val.value.stateDefinitions) {
    if (parseInt(idx, 10) === parseInt(`${index}`, 10)) {
      continue
    }
    stateDefinitions.push(val.value.stateDefinitions[idx])
  }
  val.value.stateDefinitions = stateDefinitions
  const stateStrings = stateDefinitions.map((stateDefinition) => stateDefinition.value)
  for (const slotDef of val.value.slotDefinitions) {
    for (const item of slotDef.items) {
      item.states = item.states.filter((anim) => stateStrings.includes(anim.state))
    }
  }
}

const removeSlotDefinition = (index: string | number): void => {
  const slotDefinitions: AvatarModuleAvatarSlotDefinition[] = []
  for (const idx in val.value.slotDefinitions) {
    if (parseInt(idx, 10) === parseInt(`${index}`, 10)) {
      continue
    }
    slotDefinitions.push(val.value.slotDefinitions[idx])
  }
  val.value.slotDefinitions = slotDefinitions
}

const updateSlotDefinition = (
  index: string | number,
  slotDefinition: AvatarModuleAvatarSlotDefinition,
): void => {
  val.value.slotDefinitions[parseInt(`${index}`, 10)] = slotDefinition
}

const addSlotDefinition = (): void => {
  const slotDefinition: AvatarModuleAvatarSlotDefinition = {
    slot: 'Unnamed slot',
    defaultItemIndex: -1,
    items: [],
  }
  val.value.slotDefinitions.push(slotDefinition)
}

const moveSlotUp = (idx: number): void => {
  swapItems(idx - 1, idx)
}

const moveSlotDown = (idx: number): void => {
  swapItems(idx + 1, idx)
}

const swapItems = (idx1: number, idx2: number): void => {
  arraySwap(val.value.slotDefinitions, idx1, idx2)
}

onMounted(() => {
  adjustAllImagesDivSize()
  window.addEventListener('resize', adjustAllImagesDivSize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', adjustAllImagesDivSize)
})

watch(() => props.modelValue, (value: AvatarModuleAvatarDefinition) => {
  if (currentValJson.value !== JSON.stringify(value)) {
    val.value = value
  }
})
</script>
