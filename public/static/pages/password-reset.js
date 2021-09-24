export default {
  template: `
<div class="center-screen">
  <h1 class="title is-6">Hyottoko.club</h1>

  <div class="field has-background-success-light has-text-success-dark" v-if="success">
    Password successfully set.
    Click <a href="/login">here</a> to login.
  </div>
  <form v-else>
    <div class="field has-background-danger-light has-text-danger-dark" v-if="error">
      {{error}}
    </div>
    <div class="field">
      <div class="control has-icons-left">
        <input class="input is-small" type="password" placeholder="New Password" v-model="pass" @keyup="error=''" @keyup.enter="submit"/>
        <span class="icon is-small is-left">
          <i class="fa fa-lock"></i>
        </span>
      </div>
    </div>
    <div class="field">
      <span class="button is-small is-primary" @click="submit">Save Password</span>
    </div>
  </form>
</div>
`,
  data() {
    return {
      pass: '',
      error: '',
      success: false,
    }
  },
  methods: {
    async submit() {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('t')

      this.success = false
      this.error = ''
      const res = await fetch('/api/user/_reset_password', {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pass: this.pass, token }),
      })
      if (res.status === 200) {
        this.success = true
      } else {
        try {
          this.error = (await res.json()).reason
        } catch (e) {
          this.error = 'Unknown error'
        }
      }
    },
  },
}
