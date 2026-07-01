import { act, renderHook, waitFor } from '@testing-library/react'
import { useSession } from '@supabase/auth-helpers-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listComments, createComment, updateComment, deleteComment } from '../lib/comments-api.js'
import { useComments } from './useComments.js'
import type { Comment } from '../types/comment.js'

vi.mock('../lib/comments-api.js', () => ({
  listComments: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}))

vi.mock('@supabase/auth-helpers-react', () => ({
  useSession: vi.fn(),
}))

const baseComment: Comment = {
  id: 'comment-1',
  docId: 'doc-1',
  // Root comment: threadId === id per spec
  threadId: 'comment-1',
  parentId: null,
  authorId: 'user-1',
  authorName: 'ada',
  body: 'Hello world',
  anchor: { from: 0, to: 5, quote: 'Hello' },
  resolved: false,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('useComments', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 'user-1', email: 'ada@x.com' },
      access_token: 't',
    } as ReturnType<typeof useSession>)
    vi.mocked(listComments).mockResolvedValue([baseComment])
    vi.mocked(createComment).mockResolvedValue(baseComment)
    vi.mocked(updateComment).mockResolvedValue(undefined)
    vi.mocked(deleteComment).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads comments on mount, groups into threads, clears loading', async () => {
    const { result } = renderHook(() => useComments('doc-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(listComments).toHaveBeenCalledWith('doc-1')
    expect(result.current.threads).toHaveLength(1)
    expect(result.current.threads[0].root.id).toBe('comment-1')
    expect(result.current.openThreads).toHaveLength(1)
    expect(result.current.resolvedThreads).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('refetches on window focus', async () => {
    const { result } = renderHook(() => useComments('doc-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(listComments).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => expect(listComments).toHaveBeenCalledTimes(2))
  })

  it('removes the focus listener on unmount', async () => {
    const { result, unmount } = renderHook(() => useComments('doc-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    unmount()

    vi.mocked(listComments).mockClear()
    window.dispatchEvent(new Event('focus'))
    // No additional calls after unmount
    expect(listComments).not.toHaveBeenCalled()
  })

  it('adds a comment optimistically using the returned row', async () => {
    const anchor = { from: 6, to: 11, quote: 'world' }
    const created: Comment = {
      id: 'new-id',
      docId: 'doc-1',
      threadId: 'new-thread',
      parentId: null,
      authorId: 'user-1',
      authorName: 'ada',
      body: 'A new comment',
      anchor,
      resolved: false,
      createdAt: '2026-01-02T00:00:00Z',
    }
    vi.mocked(createComment).mockResolvedValue(created)
    vi.mocked(listComments).mockResolvedValue([])

    const { result } = renderHook(() => useComments('doc-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addComment(anchor, 'A new comment')
    })

    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        docId: 'doc-1',
        parentId: null,
        authorId: 'user-1',
        authorName: 'ada',
        body: 'A new comment',
        anchor,
      }),
    )
    expect(result.current.openThreads).toHaveLength(1)
    expect(result.current.openThreads[0].root.id).toBe('new-id')
  })

  it('addComment throws when not signed in', async () => {
    vi.mocked(useSession).mockReturnValue(null as ReturnType<typeof useSession>)
    vi.mocked(listComments).mockResolvedValue([])

    const { result } = renderHook(() => useComments('doc-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.addComment({ from: 0, to: 1, quote: 'H' }, 'test')
      }),
    ).rejects.toThrow('Must be signed in')
  })

  it('replies to a thread optimistically', async () => {
    const reply: Comment = {
      id: 'reply-1',
      docId: 'doc-1',
      threadId: 'comment-1',
      parentId: 'comment-1',
      authorId: 'user-1',
      authorName: 'ada',
      body: 'A reply',
      anchor: null,
      resolved: false,
      createdAt: '2026-01-02T00:00:00Z',
    }
    vi.mocked(createComment).mockResolvedValue(reply)

    const { result } = renderHook(() => useComments('doc-1'))
    await waitFor(() => expect(result.current.threads).toHaveLength(1))

    await act(async () => {
      await result.current.reply('comment-1', 'A reply')
    })

    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'comment-1',
        parentId: 'comment-1',
        body: 'A reply',
        anchor: null,
      }),
    )
    expect(result.current.threads[0].replies).toHaveLength(1)
    expect(result.current.threads[0].replies[0].id).toBe('reply-1')
  })

  it('resolves a thread optimistically and calls updateComment', async () => {
    const { result } = renderHook(() => useComments('doc-1'))
    await waitFor(() => expect(result.current.threads).toHaveLength(1))

    await act(async () => {
      await result.current.resolve('comment-1', true)
    })

    expect(updateComment).toHaveBeenCalledWith('comment-1', { resolved: true })
    expect(result.current.resolvedThreads).toHaveLength(1)
    expect(result.current.openThreads).toHaveLength(0)
    expect(result.current.threads[0].resolved).toBe(true)
    expect(result.current.threads[0].root.resolved).toBe(true)
  })

  it('canResolve is true for the doc owner', async () => {
    const { result } = renderHook(() => useComments('doc-1', 'user-1'))
    await waitFor(() => expect(result.current.threads).toHaveLength(1))

    expect(result.current.canResolve(result.current.threads[0])).toBe(true)
  })

  it('canResolve is true for the thread author (even if not owner)', async () => {
    // current user is 'user-1'; thread author is also 'user-1'; doc owner is someone else
    const { result } = renderHook(() => useComments('doc-1', 'doc-owner'))
    await waitFor(() => expect(result.current.threads).toHaveLength(1))

    expect(result.current.canResolve(result.current.threads[0])).toBe(true)
  })

  it('canResolve is false for a non-owner non-author', async () => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 'stranger', email: 'stranger@x.com' },
      access_token: 't',
    } as ReturnType<typeof useSession>)

    const { result } = renderHook(() => useComments('doc-1', 'doc-owner'))
    await waitFor(() => expect(result.current.threads).toHaveLength(1))

    expect(result.current.canResolve(result.current.threads[0])).toBe(false)
  })

  it('canResolve is false when not signed in', async () => {
    vi.mocked(useSession).mockReturnValue(null as ReturnType<typeof useSession>)

    const { result } = renderHook(() => useComments('doc-1', 'doc-owner'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.canResolve(result.current.threads[0]!)).toBe(false)
  })

  it('removes a root comment and drops the whole thread', async () => {
    const { result } = renderHook(() => useComments('doc-1'))
    await waitFor(() => expect(result.current.threads).toHaveLength(1))

    await act(async () => {
      await result.current.remove('comment-1')
    })

    expect(deleteComment).toHaveBeenCalledWith('comment-1')
    expect(result.current.threads).toHaveLength(0)
  })

  it('removes a reply without dropping the thread', async () => {
    const reply: Comment = {
      id: 'reply-1',
      docId: 'doc-1',
      threadId: 'comment-1',
      parentId: 'comment-1',
      authorId: 'user-1',
      authorName: 'ada',
      body: 'A reply',
      anchor: null,
      resolved: false,
      createdAt: '2026-01-02T00:00:00Z',
    }
    vi.mocked(listComments).mockResolvedValue([baseComment, reply])

    const { result } = renderHook(() => useComments('doc-1'))
    await waitFor(() => expect(result.current.threads[0]?.replies).toHaveLength(1))

    await act(async () => {
      await result.current.remove('reply-1')
    })

    expect(deleteComment).toHaveBeenCalledWith('reply-1')
    expect(result.current.threads).toHaveLength(1)
    expect(result.current.threads[0].replies).toHaveLength(0)
  })

  it('sets error state when listComments fails', async () => {
    vi.mocked(listComments).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useComments('doc-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Network error')
    expect(result.current.threads).toHaveLength(0)
  })
})
