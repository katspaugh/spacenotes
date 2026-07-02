import { describe, expect, it } from 'vitest'
import type { Comment } from '../types/comment.js'
import { groupIntoThreads, reanchorThreads } from './comment-threads.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComment(overrides: Partial<Comment> & { id: string }): Comment {
  return {
    docId: 'doc-1',
    threadId: overrides.id,
    parentId: null,
    authorId: 'user-1',
    authorName: 'Alice',
    body: 'A comment',
    anchor: null,
    resolved: false,
    createdAt: '2026-06-30T12:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// groupIntoThreads
// ---------------------------------------------------------------------------

describe('groupIntoThreads', () => {
  it('groups a root with two replies correctly', () => {
    const root = makeComment({
      id: 'c-1',
      threadId: 'c-1',
      parentId: null,
      anchor: { from: 0, to: 5, quote: 'Hello' },
      createdAt: '2026-06-30T10:00:00Z',
    })
    const reply1 = makeComment({
      id: 'c-2',
      threadId: 'c-1',
      parentId: 'c-1',
      createdAt: '2026-06-30T11:00:00Z',
    })
    const reply2 = makeComment({
      id: 'c-3',
      threadId: 'c-1',
      parentId: 'c-1',
      createdAt: '2026-06-30T09:00:00Z', // earlier — to verify sort
    })

    const threads = groupIntoThreads([root, reply1, reply2])

    expect(threads).toHaveLength(1)
    expect(threads[0].root).toBe(root)
    expect(threads[0].replies).toEqual([reply2, reply1]) // sorted by createdAt asc
    expect(threads[0].resolved).toBe(false)
    expect(threads[0].outdated).toBe(false)
  })

  it('sets resolved from the root comment', () => {
    const root = makeComment({ id: 'c-1', threadId: 'c-1', resolved: true })
    const reply = makeComment({ id: 'c-2', threadId: 'c-1', parentId: 'c-1', resolved: false })

    const threads = groupIntoThreads([root, reply])

    expect(threads[0].resolved).toBe(true)
  })

  it('produces two threads sorted by root createdAt ascending', () => {
    const rootA = makeComment({
      id: 'a-1',
      threadId: 'a-1',
      createdAt: '2026-06-30T11:00:00Z',
    })
    const rootB = makeComment({
      id: 'b-1',
      threadId: 'b-1',
      createdAt: '2026-06-30T09:00:00Z', // earlier
    })

    const threads = groupIntoThreads([rootA, rootB])

    expect(threads).toHaveLength(2)
    expect(threads[0].root).toBe(rootB)
    expect(threads[1].root).toBe(rootA)
  })

  it('skips an orphan reply whose root is absent without throwing', () => {
    const orphan = makeComment({
      id: 'c-2',
      threadId: 'missing',
      parentId: 'missing-root',
    })

    expect(() => groupIntoThreads([orphan])).not.toThrow()
    const threads = groupIntoThreads([orphan])
    expect(threads).toHaveLength(0)
  })

  it('initialises outdated to false', () => {
    const root = makeComment({ id: 'r-1', threadId: 'r-1' })
    const [thread] = groupIntoThreads([root])
    expect(thread.outdated).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// reanchorThreads
// ---------------------------------------------------------------------------

describe('reanchorThreads', () => {
  const docText = 'The quick brown fox jumps'
  // "quick" is at [4, 9]

  it('leaves outdated=false when slice matches the quote exactly', () => {
    const root = makeComment({
      id: 'c-1',
      threadId: 'c-1',
      anchor: { from: 4, to: 9, quote: 'quick' },
    })
    const threads = groupIntoThreads([root])
    const result = reanchorThreads(threads, docText)

    expect(result[0].outdated).toBe(false)
    expect(result[0].root.anchor).toEqual({ from: 4, to: 9, quote: 'quick' })
  })

  it('updates anchor when quote is found at a different position (text inserted before)', () => {
    // "quick" is still in docText but the stored from/to are stale
    const root = makeComment({
      id: 'c-1',
      threadId: 'c-1',
      anchor: { from: 0, to: 5, quote: 'quick' }, // stale: wrong position
    })
    const threads = groupIntoThreads([root])
    const result = reanchorThreads(threads, docText)

    expect(result[0].outdated).toBe(false)
    expect(result[0].root.anchor).toEqual({ from: 4, to: 9, quote: 'quick' })
  })

  it('sets outdated=true when quote is not found anywhere in docText', () => {
    const root = makeComment({
      id: 'c-1',
      threadId: 'c-1',
      anchor: { from: 0, to: 6, quote: 'absent' },
    })
    const threads = groupIntoThreads([root])
    const result = reanchorThreads(threads, docText)

    expect(result[0].outdated).toBe(true)
  })

  it('leaves thread unchanged when root.anchor is null', () => {
    const root = makeComment({ id: 'c-1', threadId: 'c-1', anchor: null })
    const threads = groupIntoThreads([root])
    const result = reanchorThreads(threads, docText)

    expect(result[0].outdated).toBe(false)
    expect(result[0].root.anchor).toBeNull()
  })

  it('treats an empty quote as outdated=false with no change', () => {
    const root = makeComment({
      id: 'c-1',
      threadId: 'c-1',
      anchor: { from: 0, to: 0, quote: '' },
    })
    const threads = groupIntoThreads([root])
    const result = reanchorThreads(threads, docText)

    expect(result[0].outdated).toBe(false)
    expect(result[0].root.anchor).toEqual({ from: 0, to: 0, quote: '' })
  })

  it('does not mutate the original thread or root objects', () => {
    const root = makeComment({
      id: 'c-1',
      threadId: 'c-1',
      anchor: { from: 0, to: 5, quote: 'quick' }, // stale position
    })
    const threads = groupIntoThreads([root])
    const originalAnchor = { ...root.anchor! }
    const result = reanchorThreads(threads, docText)

    // result is a different array/object
    expect(result[0]).not.toBe(threads[0])
    expect(result[0].root).not.toBe(threads[0].root)

    // original is untouched
    expect(root.anchor).toEqual(originalAnchor)
    expect(threads[0].outdated).toBe(false)
  })
})
