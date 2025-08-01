import { useCallback, useEffect, useMemo, useRef } from 'react'
import { getUrlId, setUrlId } from '../lib/url'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api'
import { useBeforeUnload } from './useBeforeUnload'
import { randomId } from '../lib/utils'
import { type useDocState } from './useDocState'
import { useSession } from '@supabase/auth-helpers-react'

const TITLE = 'SpaceNotes'
const PENDING_FORK_KEY = 'spacenotes-fork'

export function useInitApp(state: ReturnType<typeof useDocState>) {
  const { doc, setDoc } = state
  const stringDoc = useMemo(() => JSON.stringify(doc), [doc])
  const originalDoc = useRef(stringDoc)
  // Init user session
  const session = useSession()
  const userId = session?.user?.id || ''
  const isLocked = doc.userId !== userId

  useEffect(() => {
    if (userId) {
      const stored = localStorage.getItem(PENDING_FORK_KEY)
      if (stored) {
        try {
          const saved = JSON.parse(stored)
          const newDoc = { ...saved, id: randomId(), userId }
          saveDoc(newDoc, userId)
            .then(() => {
              setDoc(newDoc)
              setUrlId(newDoc.id, newDoc.title)
              originalDoc.current = JSON.stringify(newDoc)
              localStorage.removeItem(PENDING_FORK_KEY)
            })
            .catch((err) => console.error('Error saving fork', err))
        } catch {
          // ignore JSON parsing errors
        }
      }
    }
  }, [userId, setDoc])

  // Load doc from URL
  useEffect(() => {
    const id = getUrlId()

    if (id) {
      setDoc((prevDoc) => {
        if (prevDoc.id !== id) {
          loadDoc(id)
            .then((newDoc) => {
              console.log('Loaded doc', id, newDoc)
              originalDoc.current = JSON.stringify(newDoc)
              setDoc(newDoc)
              setUrlId(newDoc.id, newDoc.title)
            })
            .catch((err) => console.error('Error loading doc', err))
          return { ...prevDoc, id }
        }
        return prevDoc
      })
    } else {
      const newId = randomId()
      setDoc((prevDoc) => ({ ...prevDoc, id: newId }))
      setUrlId(newId)
    }
  }, [setDoc])

  // Save or offer to fork on unload
  useBeforeUnload(useCallback((e: BeforeUnloadEvent) => {
    if (doc.userId === userId) {
      if (doc.id && doc.title && stringDoc !== originalDoc.current) {
        if (session?.access_token) {
          saveDocBeacon(doc, session.access_token, userId)
        } else if (userId) {
          saveDoc(doc, userId).catch((err) => console.error('Error saving doc', err))
        }
      }
      return
    }

    if (stringDoc !== originalDoc.current) {
      const shouldFork = window.confirm('Fork this space to your account?')
      if (shouldFork) {
        if (userId) {
          const newDoc = { ...doc, id: randomId(), userId }
          if (session?.access_token) {
            saveDocBeacon(newDoc, session.access_token, userId)
          } else {
            saveDoc(newDoc, userId).catch((err) => console.error('Error saving doc', err))
          }
        } else {
          localStorage.setItem(PENDING_FORK_KEY, JSON.stringify(doc))
          window.location.href = '/'
        }
        e.preventDefault()
        e.returnValue = ''
      }
    }
  }, [doc, userId, session, stringDoc]))

  // Update title
  useEffect(() => {
    document.title = doc?.title ? `${TITLE} — ${doc.title}` : TITLE
  }, [doc?.title])

  // Update background color
  useEffect(() => {
    document.body.style.backgroundColor = doc?.backgroundColor ?? ''
  }, [doc?.backgroundColor])

  // Fork current space
  const onFork = useCallback(() => {
    if (!userId) return

    setDoc((prevDoc) => {
      const newDoc = { ...prevDoc, userId }

      saveDoc(newDoc, userId)
        .then(() => {
          originalDoc.current = JSON.stringify(newDoc)
        })
        .catch((err) => console.error('Error saving doc', err))

      setUrlId(newDoc.id, newDoc.title)

      return newDoc
    })
  }, [setDoc, userId])

  // On title change handler
  const onTitleChange = useCallback((title: string) => {
    setDoc((doc) => ({ ...doc, title }))
  }, [setDoc])

  return { onFork, onTitleChange, isLocked }
}
