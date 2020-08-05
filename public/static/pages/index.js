import Navbar from "../components/navbar.js"

new Vue({
  el: '#app',
  components: {
    Navbar,
  },
  data() {
    return {
      userWidgetToken: window.DATA.userWidgetToken
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar />
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
      return `${location.protocol}//${location.host}/widget/sr/${this.userWidgetToken}/`
    },
    widgetUrlMedia() {
      return `${location.protocol}//${location.host}/widget/media/${this.userWidgetToken}/`
    },
  },
  async mounted() {
    this.$refs.main.style.marginTop = this.$refs.top.clientHeight + 'px'
  }
})
