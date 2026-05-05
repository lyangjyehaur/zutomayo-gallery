import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MODAL_THEME } from '@/lib/theme'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

export function ModalBackdrop({ onClick, zIndex = 'z-[9998]' }: { onClick?: () => void, zIndex?: string }) {
  useBodyScrollLock(true)

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
