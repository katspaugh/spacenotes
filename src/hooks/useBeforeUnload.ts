import { useEffect } from 'react'

export function useBeforeUnload(callback: (e: BeforeUnloadEvent) => void) {
  useEffect(() => {
    window.addEventListener('beforeunload', callback)
    return () => {
      window.removeEventListener('beforeunload', callback)
    }
  }, [callback])
}
