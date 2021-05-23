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
    Widgets:
    <table>
      <tr>
        <th>Title</th>
        <th>URL</th>
        <th>Hint</th>
      </tr>
      <tr v-for="widget in widgets">
        <td>{{widget.title}}</td>
        <td><a :href="widget.url">{{widget.url}}</a></td>
        <td>{{widget.hint}}</td>
      </tr>
    </table>
  </div>
</div>
`,
  computed: {
    widgets() {
      return [
        {
          title: 'Song Request',
          hint: 'Browser source, or open in browser and capture window',
          url: `${location.protocol}//${location.host}/widget/sr/${this.conf.widgetToken}/`,
        },
        {
          title: 'Media',
          hint: 'Browser source, or open in browser and capture window',
          url: `${location.protocol}//${location.host}/widget/media/${this.conf.widgetToken}/`,
        },
        {
          title: 'Speech-to-Text',
          hint: 'Google Chrome + window capture',
          url: `${location.protocol}//${location.host}/widget/speech-to-text/${this.conf.widgetToken}/`,
        },
        {
          title: 'Drawcast (Overlay)',
          hint: 'Browser source, or open in browser and capture window',
          url: `${location.protocol}//${location.host}/widget/drawcast_receive/${this.conf.widgetToken}/`,
        },
        {
          title: 'Drawcast (Draw)',
          hint: 'Open this to draw (or give to viewers to let them draw)',
          url: `${location.protocol}//${location.host}/widget/drawcast_draw/${this.conf.widgetToken}/`,
        },
      ]
    },
  },
}
