import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import '@alumni/shared/src/tokens.css'
import './styles/global.css'

const router = createRouter({
  history: createWebHistory('/alumni-book-v2/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue'),
    },
    {
      path: '/preface',
      name: 'preface',
      component: () => import('./views/PrefaceView.vue'),
    },
    {
      path: '/roster',
      name: 'roster',
      component: () => import('./views/RosterView.vue'),
    },
    {
      path: '/student/:slug',
      name: 'student',
      component: () => import('./views/StudentView.vue'),
    },
    {
      path: '/album',
      name: 'album',
      component: () => import('./views/AlbumView.vue'),
    },
  ],
})

const app = createApp(App)
app.use(router)
app.mount('#app')
