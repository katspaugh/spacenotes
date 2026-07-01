import type { Comment, CommentThread } from '../types/comment.js'

/**
 * Group a flat list of comments into threads.
 *
 * A root comment has `parentId === null`.
 * Replies are assigned to the root whose `id` matches the reply's `parentId`,
 * or (fallback) whose `threadId` matches the reply's `threadId` when `parentId`
 * is non-null.
 *
 * Roots are sorted by `createdAt` ascending; replies within each thread are
 * also sorted by `createdAt` ascending.
 *
 * Orphan replies (no matching root) are silently skipped.
 * `outdated` is initialised to `false` — callers use `reanchorThreads` to set it.
 */
export function groupIntoThreads(comments: Comment[]): CommentThread[] {
  const roots: Comment[] = []
  const repliesByRootId = new Map<string, Comment[]>()

  for (const c of comments) {
    if (c.parentId === null) {
      roots.push(c)
      if (!repliesByRootId.has(c.id)) {
        repliesByRootId.set(c.id, [])
      }
    }
  }

  for (const c of comments) {
    if (c.parentId !== null) {
      // Primary key: parentId directly references the root's id
      if (repliesByRootId.has(c.parentId)) {
        repliesByRootId.get(c.parentId)!.push(c)
      } else {
        // Fallback: use threadId to locate the root
        const root = roots.find((r) => r.threadId === c.threadId)
        if (root) {
          repliesByRootId.get(root.id)!.push(c)
        }
        // else: orphan — skip
      }
    }
  }

  roots.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return roots.map((root) => {
    const replies = (repliesByRootId.get(root.id) ?? []).slice().sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )
    return {
      root,
      replies,
      resolved: root.resolved,
      outdated: false,
    }
  })
}

/**
 * Re-anchor threads against the current document text.
 *
 * For each thread:
 * - If `root.anchor` is null → leave unchanged (outdated stays false).
 * - If `anchor.quote` is empty → leave unchanged (outdated stays false).
 * - If `docText.slice(anchor.from, anchor.to) === anchor.quote` → still
 *   anchored, outdated=false.
 * - Else search via `indexOf`; if found → update anchor to new position,
 *   outdated=false.
 * - If not found → outdated=true (stale anchor kept, no highlight for callers).
 *
 * Returns new thread objects — inputs are never mutated.
 */
export function reanchorThreads(threads: CommentThread[], docText: string): CommentThread[] {
  return threads.map((thread) => {
    const { root } = thread
    const anchor = root.anchor

    // No anchor or empty quote → no change needed; anchored (not outdated)
    if (anchor === null) {
      return { ...thread, outdated: false }
    }

    if (anchor.quote === '') {
      return { ...thread, root: { ...root }, outdated: false }
    }

    // Exact match at the stored position
    if (docText.slice(anchor.from, anchor.to) === anchor.quote) {
      return { ...thread, root: { ...root }, outdated: false }
    }

    // Relocated — search for the quote elsewhere
    const idx = docText.indexOf(anchor.quote)
    if (idx !== -1) {
      const newAnchor = { from: idx, to: idx + anchor.quote.length, quote: anchor.quote }
      return {
        ...thread,
        root: { ...root, anchor: newAnchor },
        outdated: false,
      }
    }

    // Quote deleted from document entirely
    return {
      ...thread,
      root: { ...root },
      outdated: true,
    }
  })
}
