new Vue({
  el: '#app',
  template: `<div id="app"></div>`,
  methods: {
    onMsg(e) {
      const d = JSON.parse(e.data)
      if (!d.event) {
        return
      }
      switch (d.event) {
        case 'playsound':
          const audio = new Audio(`/media/sounds/${d.data.file}`)
          audio.play();
          break
      }
    },
  },
  async mounted() {
    this.ws = new WidgetSocket('/commands')
    this.ws.onmessage = this.onMsg
  }
})
