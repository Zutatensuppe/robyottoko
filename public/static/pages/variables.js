import Navbar from '../components/navbar.js'
import DoubleclickButton from '../components/doubleclick-button.js'

export default {
  components: {
    Navbar,
    DoubleclickButton,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      unchangedJson: '[]',
      changedJson: '[]',
      variables: [],
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user.name" />
    <div id="actionbar" class="p-1">
      <button class="button is-small" @click="onAdd">Add</button>
      <button class="button is-small is-primary" :disabled="!changed" @click="sendSave">Save</button>
    </div>
  </div>
  <div id="main">
    <div class="mb-4">
      <h1 class="title mb-2">Global Variables</h1>
      <div class="help">
        Variables can be used from commands with <code>$var(variable_name)</code>.
        In addition to the global variables defined here, commands can define
        their own local variables which have precedence over the global ones.
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
          <tr v-for="(v,idx) in variables" :key="idx">
            <td>
              <input type="text" class="input is-small" v-model="v.name" />
            </td>
            <td>
              <input type="text" class="input is-small" v-model="v.value" />
            </td>
            <td>
              <doubleclick-button
                class="button is-small mr-1"
                message="Are you sure?"
                timeout="1000"
                @doubleclick="remove(idx)"><i class="fa fa-trash" /></doubleclick-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
`,
  computed: {
    changed() {
      return this.unchangedJson !== this.changedJson
    },
  },
  methods: {
    remove(idx) {
      this.variables = this.variables.filter((val, index) => index !== idx)
    },
    onAdd() {
      this.variables.push({ name: '', value: '' })
    },
    setChanged() {
      this.changedJson = JSON.stringify({
        variables: this.variables,
      })
    },
    setUnchanged() {
      this.unchangedJson = JSON.stringify({
        variables: this.variables,
      })
      this.changedJson = this.unchangedJson
    },
    async sendSave() {
      await fetch('/save-variables', {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variables: this.variables,
        })
      })
      this.setUnchanged()
    },
  },
  watch: {
    variables: {
      deep: true,
      handler() {
        this.setChanged()
      }
    }
  },
  async mounted() {
    this.variables = this.conf.variables
    this.setUnchanged()
  }
}