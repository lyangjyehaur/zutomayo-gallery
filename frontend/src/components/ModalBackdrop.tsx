import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MODAL_THEME } from '@/lib/theme'

export function ModalBackdrop({ onClick, zIndex = 'z-[9998]' }: { onClick?: () => void, zIndex?: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} ${MODAL_THEME.overlay.dialog}`}
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
