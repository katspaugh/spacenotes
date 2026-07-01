import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from '../lib/comments-api.js'
import { groupIntoThreads } from '../lib/comment-threads.js'
import type { Comment, CommentAnchor, CommentThread } from '../types/comment.js'

export function useComments(
  docId: string,
  docOwnerId?: string,
): {
  threads: CommentThread[]
  openThreads: CommentThread[]
  resolvedThreads: CommentThread[]
  loading: boolean
  error: string | null
  addComment: (anchor: CommentAnchor, body: string) => Promise<void>
  reply: (threadId: string, body: string) => Promise<void>
  resolve: (threadId: string, resolved: boolean) => Promise<void>
  remove: (id: string) => Promise<void>
  canResolve: (thread: CommentThread) => boolean
} {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const email = session?.user?.email ?? ''
  const authorName = email ? email.split('@')[0] : 'anonymous'

  const [threads, setThreads] = useState<CommentThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep refs up-to-date so mutation callbacks don't need these in their dep arrays
  const threadsRef = useRef<CommentThread[]>(threads)
  const userIdRef = useRef(userId)
  const authorNameRef = useRef(authorName)

  useEffect(() => {
    threadsRef.current = threads
  }, [threads])

  // Runs after every render to stay current
  useEffect(() => {
    userIdRef.current = userId
    authorNameRef.current = authorName
  })

  // Load on mount; refetch on window focus. Guard against stale/unmounted updates.
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const comments = await listComments(docId)
        if (cancelled) return
        setThreads(groupIntoThreads(comments))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load comments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    const onFocus = () => { void load() }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [docId])

  const addComment = useCallback(async (anchor: CommentAnchor, body: string) => {
    const uid = userIdRef.current
    if (!uid) throw new Error('Must be signed in to add a comment')

    const threadId = crypto.randomUUID()
    let created: Comment
    try {
      created = await createComment({
        docId,
        threadId,
        parentId: null,
        authorId: uid,
        authorName: authorNameRef.current,
        body,
        anchor,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
      throw err
    }

    setThreads((prev) =>
      groupIntoThreads([...prev.flatMap((t) => [t.root, ...t.replies]), created]),
    )
  }, [docId])

  const reply = useCallback(async (threadId: string, body: string) => {
    const uid = userIdRef.current
    if (!uid) throw new Error('Must be signed in to reply')

    const thread = threadsRef.current.find((t) => t.root.threadId === threadId)
    if (!thread) return

    let created: Comment
    try {
      created = await createComment({
        docId,
        threadId,
        parentId: thread.root.id,
        authorId: uid,
        authorName: authorNameRef.current,
        body,
        anchor: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reply')
      throw err
    }

    setThreads((prev) =>
      groupIntoThreads([...prev.flatMap((t) => [t.root, ...t.replies]), created]),
    )
  }, [docId])

  const resolve = useCallback(async (threadId: string, resolved: boolean) => {
    const thread = threadsRef.current.find((t) => t.root.threadId === threadId)
    if (!thread) return

    // Optimistic update
    setThreads((prev) =>
      prev.map((t) =>
        t.root.threadId === threadId
          ? { ...t, resolved, root: { ...t.root, resolved } }
          : t,
      ),
    )

    try {
      await updateComment(thread.root.id, { resolved })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve thread')
      // Roll back the optimistic update
      setThreads((prev) =>
        prev.map((t) =>
          t.root.threadId === threadId
            ? { ...t, resolved: !resolved, root: { ...t.root, resolved: !resolved } }
            : t,
        ),
      )
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    const currentThreads = threadsRef.current
    const isRoot = currentThreads.some((t) => t.root.id === id)

    // Optimistic update
    setThreads((prev) =>
      isRoot
        ? prev.filter((t) => t.root.id !== id)
        : prev.map((t) => ({ ...t, replies: t.replies.filter((r) => r.id !== id) })),
    )

    try {
      await deleteComment(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
      // Restore previous state on failure
      setThreads(currentThreads)
    }
  }, [])

  const canResolve = useCallback(
    (thread: CommentThread): boolean => {
      const uid = userIdRef.current
      if (!uid) return false
      return uid === docOwnerId || uid === thread.root.authorId
    },
    [docOwnerId],
  )

  const openThreads = useMemo(() => threads.filter((t) => !t.resolved), [threads])
  const resolvedThreads = useMemo(() => threads.filter((t) => t.resolved), [threads])

  return {
    threads,
    openThreads,
    resolvedThreads,
    loading,
    error,
    addComment,
    reply,
    resolve,
    remove,
    canResolve,
  }
}
