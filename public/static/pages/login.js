import { setCookie } from "../cookies.js"

new Vue({
  el: '#app',
  template: `
<div class="center-screen">
    <h1>Hyottoko.club</h1>
    <div style="text-align: left;">
      <div class="spacerow">
          <label>User: </label><input type="text" v-model="user" />
      </div>
      <div class="spacerow">
          <label>Pass: </label><input type="password" v-model="pass" @keyup.enter="submit"/>
      </div>
      <div class="spacerow">
          <label></label><span class="btn" @click="submit">Login</span>
      </div>
    </div>
</div>
`,
  data() {
    return {
      user: '',
      pass: '',
    }
  },
  methods: {
    async submit() {
      const res = await fetch('/auth', {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({user: this.user, pass: this.pass}),
      })
      if (res.status === 200) {
        const data = await res.json()
        if (data.token) {
          setCookie('x-token', data.token)
          location.assign('/')
        }
      }
    },
  },
})
