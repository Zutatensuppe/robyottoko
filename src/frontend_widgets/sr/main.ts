import * as Vue from 'vue'

import './main.scss'

import Page from './Page.vue'
import ResponsiveImage from './../../frontend/components/ResponsiveImage.vue'
import Youtube from './../../frontend/components/Youtube.vue'
import ListItem from './components/ListItem.vue'
const app = Vue.createApp(Page)
app.component('responsive-image', ResponsiveImage)
app.component('youtube', Youtube)
app.component('list-item', ListItem)
app.mount('#app');
