import { useCallback, useEffect, useRef } from 'react'
import { Auth } from './Auth.js'

type LoginModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose],
  )

  if (!isOpen) return null

  return (
    <div className="Modal_overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="Modal_content">
        <button className="Modal_close" onClick={onClose}>
          &times;
        </button>
        <h2>Sign in to Space Notes</h2>
        <Auth onSuccess={onSuccess} />
      </div>
    </div>
  )
}
