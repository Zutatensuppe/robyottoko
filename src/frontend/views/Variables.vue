<template>
  <div class="view">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
        <button class="button is-small" @click="onAdd">Add</button>
        <button class="button is-small is-primary" :disabled="!changed" @click="sendSave">
          Save
        </button>
      </div>
    </div>
    <div id="main">
      <div class="mb-4">
        <h1 class="title mb-2">Global Variables</h1>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, idx) in variables" :key="idx">
              <td>
                <input type="text" class="input is-small" v-model="v.name" />
              </td>
              <td>
                <input type="text" class="input is-small" v-model="v.value" />
              </td>
              <td>
                <doubleclick-button class="button is-small mr-1" message="Are you sure?" :timeout="1000"
                  @doubleclick="remove(idx)"><i class="fa fa-trash" /></doubleclick-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { GlobalVariable } from "../../types";
import api from "../api";

interface ComponentData {
  unchangedJson: string
  changedJson: string
  variables: GlobalVariable[]
}

export default defineComponent({
  data: (): ComponentData => ({
    unchangedJson: "[]",
    changedJson: "[]",
    variables: [],
  }),
  computed: {
    changed() {
      return this.unchangedJson !== this.changedJson;
    },
  },
  methods: {
    remove(idx: number): void {
      this.variables = this.variables.filter((_val: GlobalVariable, index: number) => index !== idx);
    },
    onAdd(): void {
      this.variables.push({ name: "", value: "" });
    },
    setChanged(): void {
      this.changedJson = JSON.stringify({
        variables: this.variables,
      });
    },
    setUnchanged(): void {
      this.unchangedJson = JSON.stringify({
        variables: this.variables,
      });
      this.changedJson = this.unchangedJson;
    },
    async sendSave(): Promise<void> {
      await api.saveVariables({
        variables: this.variables,
      });
      this.setUnchanged();
    },
  },
  watch: {
    variables: {
      deep: true,
      handler() {
        this.setChanged();
      },
    },
  },
  async mounted() {
    const res = await api.getPageVariablesData();
    if (res.status !== 200) {
      this.$router.push({ name: "login" });
      return;
    }

    const data: { variables: GlobalVariable[] } = await res.json();
    this.variables = data.variables;
    this.setUnchanged();
  },
});
</script>
