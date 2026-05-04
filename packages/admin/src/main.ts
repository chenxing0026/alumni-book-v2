import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import '@alumni/shared/src/tokens.css'
import './styles/admin.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin/login',
      name: 'login',
      component: () => import('./views/LoginView.vue'),
    },
    {
      path: '/admin',
      component: () => import('./views/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
        { path: 'students', name: 'students', component: () => import('./views/StudentsView.vue') },
        { path: 'students/:id', name: 'student-edit', component: () => import('./views/StudentEditView.vue') },
        { path: 'albums', name: 'albums', component: () => import('./views/AlbumsView.vue') },
        { path: 'settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const isLoggedIn = !!sessionStorage.getItem('admin_token')
  if (to.name !== 'login' && !isLoggedIn) {
    return { name: 'login' }
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
