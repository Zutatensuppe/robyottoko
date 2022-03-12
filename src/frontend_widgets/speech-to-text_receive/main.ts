import * as Vue from 'vue'

import './../speech-to-text/main.css'

import Page from './../speech-to-text/Page.vue'
const app = Vue.createApp(Page, { controls: false })
app.mount('#app');
