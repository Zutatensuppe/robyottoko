import * as Vue from 'vue'
import util from './util'

import Page from './Page.vue'
const app = Vue.createApp(Page, { widget: util.widget() })
app.mount('#app');
