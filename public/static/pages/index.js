import Navbar from "../components/navbar.js"

export default {
  components: {
    Navbar,
  },
  props: {
    conf: Object,
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user.name" />
  </div>
  <div id="main" ref="main">
    <table class="table is-striped">
      <thead>
        <tr>
          <th>Title</th>
          <th>URL</th>
          <th>Hint</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="widget in widgets">
          <td>{{widget.title}}</td>
          <td><a :href="widget.url">{{widget.url}}</a></td>
          <td>{{widget.hint}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
`,
  computed: {
    widgets() {
      return this.conf.widgets
    },
  },
}
