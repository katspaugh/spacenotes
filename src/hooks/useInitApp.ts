import { useCallback, useEffect, useMemo, useRef } from 'react'
import { getUrlId, setUrlId, makeUrl } from '../lib/url.js'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api.js'
import { useBeforeUnload } from './useBeforeUnload.js'
import { randomId } from '../lib/utils.js'
import { type useDocState } from './useDocState.js'
import { useSession } from '@supabase/auth-helpers-react'
import { isSpaceDoc } from '../lib/doc-kind.js'

const TITLE = 'SpaceNotes'
const PENDING_FORK_KEY = 'spacenotes-fork'

export function useInitApp(state: ReturnType<typeof useDocState> & { sessionToken: string }) {
  const { doc, setDoc, sessionToken } = state as ReturnType<typeof useDocState> & { sessionToken: string }
  const stringDoc = useMemo(() => JSON.stringify(doc), [doc])
  const originalDoc = useRef(stringDoc)
  // Init user session
  const session = useSession()
  const userId = session?.user?.id || ''
  const isOwner = !doc.userId || doc.userId === userId
  const isLocked = !isOwner && !sessionToken

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
              if (!isSpaceDoc(newDoc)) {
                throw new Error('Loaded document is not a space')
              }
              console.log('Loaded doc', id, newDoc)
              originalDoc.current = JSON.stringify(newDoc)
              setDoc(newDoc)
              setUrlId(newDoc.id, newDoc.title, 'space')
            })
            .catch((err) => {
              console.error('Error loading doc', err)
            })
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

  // Check if user has made changes
  const hasUnsavedChanges = stringDoc !== originalDoc.current

  // Save or offer to fork on unload
  useBeforeUnload(useCallback((e: BeforeUnloadEvent) => {
    const hasChanges = stringDoc !== originalDoc.current

    // Case 1: User is owner and logged in - auto-save
    if (isOwner && userId) {
      if (doc.id && doc.title && hasChanges) {
        if (session?.access_token) {
          saveDocBeacon(doc, session.access_token, userId)
        } else {
          saveDoc(doc, userId).catch((err) => console.error('Error saving doc', err))
        }
      }
      return
    }

    // Case 2: User is NOT logged in and has made changes - show browser confirm
    if (!userId && hasChanges) {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Sign in to save your work!'
      return
    }

    // Case 3: Non-owner trying to close (existing fork logic)
    if (!sessionToken && hasChanges) {
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
        }
        e.preventDefault()
        e.returnValue = ''
      }
    }
  }, [doc, userId, session, stringDoc, sessionToken, isOwner]))

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

  // Post-login save handler - saves the current space to the user's account
  const onPostLoginSave = useCallback(() => {
    if (!userId || !doc.id) return

    // Check if we have unsaved changes
    if (stringDoc === originalDoc.current) return

    // If no title, prompt for one
    if (!doc.title) {
      const title = window.prompt('Enter a title for your space:')
      if (title) {
        const updatedDoc = { ...doc, title, userId }
        saveDoc(updatedDoc, userId)
          .then(() => {
            setDoc(updatedDoc)
            setUrlId(updatedDoc.id, updatedDoc.title)
            originalDoc.current = JSON.stringify(updatedDoc)
          })
          .catch((err) => console.error('Error saving doc', err))
      }
      return
    }

    // Has title, auto-save
    const updatedDoc = { ...doc, userId }
    saveDoc(updatedDoc, userId)
      .then(() => {
        setDoc(updatedDoc)
        originalDoc.current = JSON.stringify(updatedDoc)
      })
      .catch((err) => console.error('Error saving doc', err))
  }, [doc, userId, stringDoc, setDoc])

  // Share handler - saves the current space and copies the link
  const onShare = useCallback(() => {
    if (!doc.id) return

    const url = makeUrl(doc.id, doc.title)

    // If owner and logged in, save first then copy
    if (isOwner && userId) {
      const updatedDoc = { ...doc, userId }
      saveDoc(updatedDoc, userId)
        .then(() => {
          originalDoc.current = JSON.stringify(updatedDoc)
          return navigator.clipboard.writeText(url)
        })
        .then(() => {
          alert('Link copied!')
        })
        .catch((err) => console.error('Error sharing', err))
    } else {
      // Just copy the link for non-owners or non-logged-in users
      navigator.clipboard
        .writeText(url)
        .then(() => {
          alert('Link copied!')
        })
        .catch((err) => console.error('Error copying link', err))
    }
  }, [doc, userId, isOwner])

  return { onFork, onTitleChange, isLocked, isOwner, hasUnsavedChanges, onPostLoginSave, onShare }
}
