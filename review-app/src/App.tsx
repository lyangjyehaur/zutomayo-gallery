import { App as F7App, View } from 'framework7-react'
import routes from './routes'

const f7params = {
  name: 'ZTMR Review',
  theme: 'auto',
  darkMode: 'auto',
  colors: {
    primary: '#6C5CE7',
  },
  routes,
}

export default function App() {
  return (
    <F7App {...f7params}>
      <View main url="/" />
    </F7App>
  )
}
