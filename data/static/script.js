class Ws {
  constructor(addr, protocols) {
    this.addr = addr
    this.protocols = protocols
    this.handle = null
    this.timeout = null
    this.queue = []
    this.onopen = () => {}
    this.onclose = () => {}
    this.onmessage = () => {}
    this._connect()
  }

  send (txt) {
    if (this.handle) {
      this.handle.send(txt)
    } else {
      this.queue.add(txt)
    }
  }

  _connect() {
    let ws = new WebSocket(this.addr, this.protocols)
    ws.onopen = (e) => {
      console.log('websocket onopen')
      if (this.timeout) {
        clearTimeout(this.timeout)
      }
      this.handle = ws
      // should have a queue worker
      while (this.queue.length > 0) {
        this.handle.send(this.queue.shift())
      }
      this.onopen(e)
    }
    ws.onmessage = (e) => {
      console.log('websocket onmessage')
      this.onmessage(e)
    }
    ws.onclose = (e) => {
      console.log('websocket onclose')
      this.handle = null
      this.timeout = setTimeout(() => { this._connect() }, 1000)
      this.onclose(e)
    }
  }
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000))
  const expires = `expires=${d.toUTCString()}`
  document.cookie = `${cname}=${cvalue};${expires};path=/`
}

function getCookie(cname) {
  const name = `${cname}=`
  const decodedCookie = decodeURIComponent(document.cookie)
  const ca = decodedCookie.split(';')
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length)
    }
  }
  return ''
}

function loginSuccess(token) {
  setCookie('x-token', token)
}

class Sockhyottoko extends Ws {
  constructor(addr) {
    super(window.WS_BASE + addr, ['x-token', getCookie('x-token')]);
  }
}

Vue.component('navbar', {
  data() {
    return {
      user: window.USER
    }
  },
  template: `
    <div id="navbar">
      <div class="logo">
        <img src="/static/hyottoko.png" width="32" height="32" alt="hyottoko.club" class="flip-horizontal" />
      </div>
      <ul class="items" v-if="user">
        <li>Welcome back, {{ user }}
        <li><a href="/commands/">Commands</a>
        <li><a href="/sr/">SR</a>
        <li><a href="/sr/player">SR player</a>
        <li><a href="/logout">Logout</a>
      </ul>
    </div>
`
})
