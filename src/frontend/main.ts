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

(async () => {
  const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes: [
      {
        name: 'index', path: '/', component: Index, meta: {
          title: 'Hyottoko.club',
        }
      },
      {
        name: 'login', path: '/login', component: Login, meta: {
          title: 'Login',
        }
      },
      {
        name: 'register', path: '/register', component: Register, meta: {
          title: 'Register',
        }
      },
      {
        name: 'password-reset', path: '/password-reset', component: PasswordReset, meta: {
          title: 'Password Reset',
        }
      },
      {
        name: 'forgot-password', path: '/forgot-password', component: ForgotPassword, meta: {
          title: 'Forgot Password',
        }
      },
      {
        name: 'commands', path: '/commands/', component: Commands, meta: {
          title: 'Commands',
        }
      },
      {
        name: 'variables', path: '/variables/', component: Variables, meta: {
          title: 'Variables',
        }
      },
      {
        name: 'sr', path: '/sr/', component: SongRequest, meta: {
          title: 'Song Request',
        }
      },
      {
        name: 'speech-to-text', path: '/speech-to-text/', component: SpeechToText, meta: {
          title: 'Speech to text',
        }
      },
      {
        name: 'drawcast', path: '/drawcast/', component: Drawcast, meta: {
          title: 'Drawcast',
        }
      },
      {
        name: 'settings', path: '/settings/', component: Settings, meta: {
          title: 'Settings',
        }
      },
    ],
  })

  router.beforeEach((to, from) => {
    if (from.name) {
      document.documentElement.classList.remove(`view-${String(from.name)}`)
    }
    document.documentElement.classList.add(`view-${String(to.name)}`)

    document.title = `${to.meta.title}`
  })

  const app = Vue.createApp(App)
  app.use(router)
  app.mount('#app')
})()
