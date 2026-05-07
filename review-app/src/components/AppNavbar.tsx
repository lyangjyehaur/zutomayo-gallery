import { Navbar } from 'framework7-react'

interface AppNavbarProps {
  title: string
  subtitle?: string
}

export default function AppNavbar({ title, subtitle }: AppNavbarProps) {
  return <Navbar title={title} subtitle={subtitle} />
}
