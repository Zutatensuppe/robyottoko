import * as VueRouter from 'vue-router'
import * as Vue from 'vue'

import App from './App.vue'
import Index from './views/Index.vue'
import Login from './views/Login.vue'
import Drawcast from './views/Drawcast.vue'
import Variables from './views/Variables.vue'
import Register from './views/Register.vue'
import Settings from './views/Settings.vue'
import SongRequest from './views/SongRequest.vue'
import Commands from './views/Commands.vue'
import SpeechToText from './views/SpeechToText.vue'
import PasswordReset from './views/PasswordReset.vue'
import ForgotPassword from './views/ForgotPassword.vue'

const run = async () => {
  const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes: [
      {
        name: 'index', path: '/', component: Index, meta: {
          title: 'Hyottoko.club',
          protected: true,
        }
      },
      {
        name: 'login', path: '/login', component: Login, meta: {
          title: 'Login',
          protected: false,
        }
      },
      {
        name: 'register', path: '/register', component: Register, meta: {
          title: 'Register',
          protected: false,
        }
      },
      {
        name: 'password-reset', path: '/password-reset', component: PasswordReset, meta: {
          title: 'Password Reset',
          protected: false,
        }
      },
      {
        name: 'forgot-password', path: '/forgot-password', component: ForgotPassword, meta: {
          title: 'Forgot Password',
          protected: false,
        }
      },
      {
        name: 'commands', path: '/commands/', component: Commands, meta: {
          title: 'Commands',
          protected: true,
        }
      },
      {
        name: 'variables', path: '/variables/', component: Variables, meta: {
          title: 'Variables',
          protected: true,
        }
      },
      {
        name: 'sr', path: '/sr/', component: SongRequest, meta: {
          title: 'Song Request',
          protected: true,
        }
      },
      {
        name: 'speech-to-text', path: '/speech-to-text/', component: SpeechToText, meta: {
          title: 'Speech to text',
          protected: true,
        }
      },
      {
        name: 'drawcast', path: '/drawcast/', component: Drawcast, meta: {
          title: 'Drawcast',
          protected: true,
        }
      },
      {
        name: 'settings', path: '/settings/', component: Settings, meta: {
          title: 'Settings',
          protected: true,
        }
      },
    ],
  })

  const getJson = async (path) => {
    const res = await fetch(path);
    return res.status === 200 ? (await res.json()) : null
  }

  const conf = await getJson('/api/conf')
  const me = await getJson('/api/user/me')

  router.beforeEach((to, from, next) => {
    if (to.meta.protected && !me) {
      next({ name: 'login' })
      return
    }
    if (!to.meta.protected && me) {
      next({ name: 'index' })
      return
    }

    if (from.name) {
      document.documentElement.classList.remove(`view-${String(from.name)}`)
    }
    document.documentElement.classList.add(`view-${String(to.name)}`)

    document.title = `${to.meta.title}`
    next()
  })

  const app = Vue.createApp(App)
  app.config.globalProperties.$conf = conf
  app.config.globalProperties.$me = me
  app.use(router)
  app.mount('#app')
}

run()
