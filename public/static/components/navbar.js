export default {
  name: 'navbar',
  props: {
    user: String,
  },
  template: `
    <div id="navbar">
      <div class="logo">
        <img src="/static/hyottoko.png" width="32" height="32" alt="hyottoko.club" class="flip-horizontal" />
      </div>
      <ul class="items" v-if="user">
        <li class="greeting">Welcome back, {{ user }}
        <li><a href="/">Widgets</a>
        <li><a href="/commands/">Commands</a>
        <li><a href="/sr/">Song Request</a>
        <li><a href="/speech-to-text/">Speech-To-Text</a>
        <li><a href="/settings/">Settings</a>
        <li><a href="/logout">Logout</a>
      </ul>
    </div>
`,
  methods: {
    restyle () {
      // TODO: create top element. and do this there
      const el = document.getElementById('top')
      if (window.scrollY > 0) {
        el.style.position = 'fixed'
      } else {
        el.style.position = 'static'
      }
    },
  },
  mounted() {
    window.addEventListener('scroll', (ev) => {
      this.restyle()
    })
    window.addEventListener('resize', (ev) => {
      this.restyle()
    })
  },
}
