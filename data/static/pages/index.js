new Vue({
  el: '#app',
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
        sounds: <a :href="widgetUrlSounds" target="_blank">{{widgetUrlSounds}}</a>
    </div>
  </div>
</div>
`,
  computed: {
    widgetUrlSongRequest() {
      return `${location.protocol}//${location.host}/widget/sr/${this.userWidgetToken}/`
    },
    widgetUrlSounds() {
      return `${location.protocol}//${location.host}/widget/sounds/${this.userWidgetToken}/`
    },
  },
  async mounted() {
    this.$refs.main.style.marginTop = 'calc(' + this.$refs.top.clientHeight + 'px + 1em)'
  }
})
