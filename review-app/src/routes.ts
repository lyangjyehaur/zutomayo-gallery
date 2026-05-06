import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import StagingPage from './pages/StagingPage'
import SubmissionsPage from './pages/SubmissionsPage'

export default [
  {
    path: '/',
    component: HomePage,
  },
  {
    path: '/login/',
    component: LoginPage,
  },
  {
    path: '/staging/',
    component: StagingPage,
  },
  {
    path: '/submissions/',
    component: SubmissionsPage,
  },
]
