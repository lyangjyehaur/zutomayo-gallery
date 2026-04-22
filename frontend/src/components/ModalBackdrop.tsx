import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MODAL_THEME } from '@/lib/theme'

export function ModalBackdrop({ onClick }: { onClick?: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div
      className={`fixed inset-0 z-[9998] ${MODAL_THEME.overlay.dialog}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick?.()
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    />,
    document.body,
  )
}
