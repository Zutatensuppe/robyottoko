export default {
  template: `
<div class="center-screen">
  <h1 class="title is-6">Hyottoko.club</h1>
  <form>
    <div class="field has-background-danger-light has-text-danger-dark" v-if="error">
      {{error}}
    </div>
    <div class="field">
      <div class="control has-icons-left">
        <input class="input is-small" type="text" placeholder="User" v-model="user" @keyup="error=''" />
        <span class="icon is-small is-left">
          <i class="fa fa-user"></i>
        </span>
      </div>
    </div>
    <div class="field">
      <div class="control has-icons-left">
        <input class="input is-small" type="password" placeholder="Password" v-model="pass" @keyup="error=''" @keyup.enter="submit"/>
        <span class="icon is-small is-left">
          <i class="fa fa-lock"></i>
        </span>
      </div>
    </div>
    <div class="field">
      <span class="button is-small is-primary" @click="submit">Login</span>
    </div>
  </form>
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
        body: JSON.stringify({ user: this.user, pass: this.pass }),
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
