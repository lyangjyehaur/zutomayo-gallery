import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import StagingPage from './pages/StagingPage'
import SubmissionsPage from './pages/SubmissionsPage'
import FanartPage from './pages/FanartPage'
import RepairPage from './pages/RepairPage'
import SettingsPage from './pages/SettingsPage'
import { checkAuth } from './lib/api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authGuard = async ({ resolve, reject, router }: any) => {
  const user = await checkAuth()
  if (user) {
    resolve()
  } else {
    // Reject current navigation and manually navigate to login
    reject()
    // Use a small delay to ensure the rejection is processed
    setTimeout(() => {
      if (router && router.navigate) {
        router.navigate('/login/', { reloadAll: true })
      }
    }, 0)
  }
}

const routes = [
  {
    path: '/login/',
    component: LoginPage,
  },
  {
    path: '/home/',
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
  {
    path: '/fanart/',
    component: FanartPage,
    beforeEnter: authGuard,
  },
  {
    path: '/repair/',
    component: RepairPage,
    beforeEnter: authGuard,
  },
  {
    path: '/settings/',
    component: SettingsPage,
    beforeEnter: authGuard,
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default routes as unknown as any[]
