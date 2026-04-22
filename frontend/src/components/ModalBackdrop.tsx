import { useEffect } from 'react'
import { createPortal } from 'react-dom'

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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
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
