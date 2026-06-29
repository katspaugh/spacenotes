import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import { createTextDoc, isTextDoc } from '../lib/doc-kind.js'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api.js'
import type { TextDocData, TipTapJSON } from '../types/doc.js'
import { setUrlId } from '../lib/url.js'
import { useBeforeUnload } from './useBeforeUnload.js'

const AUTOSAVE_MS = 800

export function useTextDocState(id: string) {
  const session = useSession()
  const userId = session?.user?.id || ''
  const [doc, setDoc] = useState<TextDocData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const originalDoc = useRef('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stringDoc = useMemo(() => JSON.stringify(doc), [doc])
  const isOwner = !doc?.userId || doc.userId === userId
  const isLocked = !isOwner || !userId

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    loadDoc(id)
      .then((loaded) => {
        if (cancelled) return
        if (!isTextDoc(loaded)) {
          throw new Error('Loaded document is not a text document')
        }
        setDoc(loaded)
        originalDoc.current = JSON.stringify(loaded)
        setUrlId(loaded.id, loaded.title, 'doc')
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof Error && err.message === 'Document not found') {
          const draft = createTextDoc(id, userId || undefined)
          setDoc(draft)
          originalDoc.current = JSON.stringify(draft)
          setUrlId(draft.id, draft.title, 'doc')
          return
        }
        console.error('Error loading text document', err)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, userId])

  useEffect(() => {
    if (!doc || !isOwner || !userId) return
    if (stringDoc === originalDoc.current) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const docToSave = { ...doc, userId }
      saveDoc(docToSave, userId)
        .then(() => {
          originalDoc.current = JSON.stringify(docToSave)
          setUrlId(docToSave.id, docToSave.title, 'doc')
        })
        .catch((err) => console.error('Error saving text document', err))
    }, AUTOSAVE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [doc, isOwner, stringDoc, userId])

  useBeforeUnload(useCallback(() => {
    if (!doc || !isOwner || !userId) return
    if (JSON.stringify(doc) === originalDoc.current) return

    const docToSave = { ...doc, userId }
    if (session?.access_token) {
      saveDocBeacon(docToSave, session.access_token, userId)
    } else {
      saveDoc(docToSave, userId).catch((err) => console.error('Error saving text document', err))
    }
  }, [doc, isOwner, session, userId]))

  useEffect(() => {
    document.title = doc?.title ? `SpaceNotes — ${doc.title}` : 'SpaceNotes'
  }, [doc?.title])

  const onTitleChange = useCallback((title: string) => {
    setDoc((current) => current ? { ...current, title } : current)
  }, [])

  const onContentChange = useCallback((content: TipTapJSON) => {
    setDoc((current) => current ? { ...current, content } : current)
  }, [])

  const onPostLoginSave = useCallback(() => {
    if (!doc || !userId) return

    const docToSave = { ...doc, userId }
    saveDoc(docToSave, userId)
      .then(() => {
        originalDoc.current = JSON.stringify(docToSave)
        setDoc(docToSave)
        setUrlId(docToSave.id, docToSave.title, 'doc')
      })
      .catch((err) => console.error('Error saving text document after login', err))
  }, [doc, userId])

  return {
    doc,
    isOwner,
    isLocked,
    isLoading,
    onTitleChange,
    onContentChange,
    onPostLoginSave,
  }
}
