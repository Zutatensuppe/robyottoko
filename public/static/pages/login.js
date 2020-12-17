export default {
  template: `
<div class="center-screen">
    <h1>Hyottoko.club</h1>
    <div style="text-align: left;">
      <div class="spacerow">
          <label>User: </label>
          <input type="text" v-model="user" @keyup="error=''" />
      </div>
      <div class="spacerow">
          <label>Pass: </label>
          <input type="password" v-model="pass" @keyup="error=''" @keyup.enter="submit"/>
      </div>
      <div class="spacerow">
          <label></label><span class="btn" @click="submit">Login</span>
      </div>
      <div v-if="error">
        {{error}}
      </div>
    </div>
</div>
`,
  data() {
    return {
      user: '',
      pass: '',
      error: '',
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
        location.assign('/')
      } else if (res.status === 401) {
        this.error = (await res.json()).reason
      } else {
        this.error = 'Unknown error'
      }
    },
  },
}
