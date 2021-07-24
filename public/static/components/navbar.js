export default {
  name: 'navbar',
  props: {
    user: String,
  },
  data() {
    return {
      linksStart: [
        {
          href: '/',
          text: 'Widgets',
        },
        {
          href: '/commands/',
          text: 'Commands',
        },
        {
          href: '/sr/',
          text: 'Song Request',
        },
        {
          href: '/speech-to-text/',
          text: 'Speech-To-Text',
        },
        {
          href: '/drawcast/',
          text: 'Drawcast',
        },
        {
          href: '/settings/',
          text: 'Settings',
        },
      ],
      linksEnd: [
        {
          href: '/logout',
          text: 'Logout',
        },
      ],
      burgerActive: false,
    }
  },
  template: `
    <nav class="navbar" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <a class="navbar-item" href="/">
          <img
            src="/static/hyottoko.png"
            width="32"
            height="32"
            alt="hyottoko.club"
            class="flip-horizontal mr-1" />
            <span class="greeting">Welcome back, {{ user }}</span>
        </a>

        <a role="button"
          class="navbar-burger"
          :class="{'is-active': burgerActive}"
          aria-label="menu"
          aria-expanded="false"
          data-target="navbarBasicExample"
          @click="toggleBurgerMenu">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
      <div
        id="navbarBasicExample"
        class="navbar-menu"
        :class="{'is-active': burgerActive}">
        <div class="navbar-start">
          <a class="navbar-item" v-for="(l,idx) in linksStart" :key="idx" :href="l.href">{{l.text}}</a>
        </div>
        <div class="navbar-end">
          <a class="navbar-item" v-for="(l,idx) in linksEnd" :key="idx" :href="l.href">{{l.text}}</a>
        </div>
      </div>
    </nav>
`,
  methods: {
    toggleBurgerMenu() {
      this.burgerActive = !this.burgerActive
    }
  },
}
