import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import StagingPage from './pages/StagingPage'
import SubmissionsPage from './pages/SubmissionsPage'
import { checkAuth } from './lib/api'

const authGuard = async ({ resolve }: any) => {
  const user = await checkAuth()
  if (user) {
    resolve()
  } else {
    resolve({ redirect: '/login/' })
  }
}

export default [
  {
    path: '/login/',
    component: LoginPage,
  },
  {
    path: '/',
    component: HomePage,
    beforeEnter: authGuard,
  },
  {
    path: '/staging/',
    component: StagingPage,
    beforeEnter: authGuard,
  },
  {
    path: '/submissions/',
    component: SubmissionsPage,
    beforeEnter: authGuard,
  },
]
