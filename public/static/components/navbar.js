export default {
  name: 'navbar',
  props: {
    user: String,
  },
  data () {
    return {
      links: [
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
        {
          href: '/logout',
          text: 'Logout',
        },
      ],
    }
  },
  template: `
    <div id="navbar">
      <div class="logo">
        <img
          src="/static/hyottoko.png"
          width="32"
          height="32"
          alt="hyottoko.club"
          class="flip-horizontal" />
      </div>
      <ul class="items" v-if="user">
        <li class="greeting">Welcome back, {{ user }}</li>
        <li v-for="(l,idx) in links" :key="idx">
          <a :href="l.href">{{l.text}}</a>
        </li>
      </ul>
    </div>
`,
}
