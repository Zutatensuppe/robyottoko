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
    <navbar :user="conf.user" />
  </div>
  <div id="main" ref="main">
    Widgets for OBS:
    <div>
        song request: <a :href="widgetUrlSongRequest" target="_blank">{{widgetUrlSongRequest}}</a>
    </div>
    <div>
        media: <a :href="widgetUrlMedia" target="_blank">{{widgetUrlMedia}}</a>
    </div>
  </div>
</div>
`,
  computed: {
    widgetUrlSongRequest() {
      return `${location.protocol}//${location.host}/widget/sr/${this.conf.widgetToken}/`
    },
    widgetUrlMedia() {
      return `${location.protocol}//${location.host}/widget/media/${this.conf.widgetToken}/`
    },
  },
  async mounted() {
    this.$refs.main.style.marginTop = this.$refs.top.clientHeight + 'px'
  }
}
