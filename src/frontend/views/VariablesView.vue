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
          class="button is-small"
          @click="onAdd"
        >
          Add
        </button>
        <button
          class="button is-small is-primary"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
      </div>
    </div>
    <div id="main">
      <div class="mb-4">
        <h1 class="title mb-2">
          Global Variables
        </h1>
        <div class="help">
          Variables can be used from commands with
          <code>$var(variable_name)</code>. In addition to the global variables
          defined here, commands can define their own local variables which have
          precedence over the global ones.
        </div>
        <table class="table is-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(v, idx) in variables"
              :key="idx"
            >
              <td>
                <StringInput v-model="v.name" />
              </td>
              <td>
                <StringInput v-model="v.value" />
              </td>
              <td>
                <DoubleclickButton
                  class="button is-small mr-1"
                  message="Are you sure?"
                  :timeout="1000"
                  @doubleclick="remove(idx)"
                >
                  <i class="fa fa-trash" />
                </DoubleclickButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { GlobalVariable } from '../../types'
import api from '../_api'
import StringInput from '../components/StringInput.vue'
import DoubleclickButton from '../components/DoubleclickButton.vue'
import NavbarElement from '../components/NavbarElement.vue'

const unchangedJson = ref<string>('[]')
const changedJson = ref<string>('[]')
const variables = ref<GlobalVariable[]>([])

const changed = computed(() => unchangedJson.value !== changedJson.value)

const remove = (idx: number): void => {
  variables.value = variables.value.filter((_val: GlobalVariable, index: number) => index !== idx)
}

const onAdd = (): void => {
  variables.value.push({ name: '', value: '' })
}

const setChanged = (): void => {
  changedJson.value = JSON.stringify({
    variables: variables.value,
  })
}

const setUnchanged = (): void => {
  unchangedJson.value = JSON.stringify({
    variables: variables.value,
  })
  changedJson.value = unchangedJson.value
}

const sendSave = async (): Promise<void> => {
  await api.saveVariables({
    variables: variables.value,
  })
  setUnchanged()
}

const router = useRouter()
onMounted(async () => {
  const res = await api.getPageVariablesData()
  if (res.status !== 200) {
    router.push({ name: 'login' })
    return
  }

  const data: { variables: GlobalVariable[] } = await res.json()
  variables.value = data.variables
  setUnchanged()

  watch(variables, () => {
    setChanged()
  }, { deep: true })
})
</script>
