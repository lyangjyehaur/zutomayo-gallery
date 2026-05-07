import { Navbar, NavLeft, NavRight, Link } from 'framework7-react'

interface AppNavbarProps {
  title: string
  subtitle?: string
}

export default function AppNavbar({ title, subtitle }: AppNavbarProps) {
  return (
    <Navbar className="review-navbar" title={title} subtitle={subtitle}>
      <NavLeft>
        <Link className="review-nav-link" panelOpen="left" iconIos="f7:menu" iconMd="material:menu" />
      </NavLeft>
      <NavRight>
        <Link
          className="review-nav-link"
          sheetOpen=".workspace-switcher-sheet"
          iconIos="f7:square_grid_2x2_fill"
          iconMd="material:apps"
        />
      </NavRight>
    </Navbar>
  )
}
