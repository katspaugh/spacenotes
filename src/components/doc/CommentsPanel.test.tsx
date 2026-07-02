import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CommentThread } from '../../types/comment.js'
import { CommentsPanel } from './CommentsPanel.js'

const NOW_ISO = '2025-06-01T12:00:00Z'

function makeThread(id: string, name = 'Maya Reyes', resolved = false): CommentThread {
  return {
    root: {
      id,
      docId: 'doc-1',
      threadId: id,
      parentId: null,
      authorId: 'user-1',
      authorName: name,
      body: `Comment ${id}`,
      anchor: { from: 0, to: 5, quote: 'hello' },
      resolved,
      createdAt: NOW_ISO,
    },
    replies: [],
    resolved,
    outdated: false,
  }
}

const openThreads = [makeThread('t1', 'Alice'), makeThread('t2', 'Bob')]
const resolvedThreads = [makeThread('t3', 'Carol', true)]

describe('CommentsPanel', () => {
  it('renders the Comments heading', () => {
    render(
      <CommentsPanel
        openThreads={openThreads}
        resolvedThreads={resolvedThreads}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={true}
        canResolve={() => true}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText('Comments')).toBeInTheDocument()
  })

  it('shows Open tab with correct count', () => {
    render(
      <CommentsPanel
        openThreads={openThreads}
        resolvedThreads={resolvedThreads}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={true}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText(`Open · ${openThreads.length}`)).toBeInTheDocument()
  })

  it('shows Resolved tab with correct count', () => {
    render(
      <CommentsPanel
        openThreads={openThreads}
        resolvedThreads={resolvedThreads}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={false}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText(`Resolved · ${resolvedThreads.length}`)).toBeInTheDocument()
  })

  it('defaults to the Open tab and shows open threads', () => {
    render(
      <CommentsPanel
        openThreads={openThreads}
        resolvedThreads={resolvedThreads}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={false}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText(/Comment t1/)).toBeInTheDocument()
    expect(screen.getByText(/Comment t2/)).toBeInTheDocument()
    // Resolved thread not shown on Open tab
    expect(screen.queryByText(/Comment t3/)).toBeNull()
  })

  it('switching to Resolved tab shows resolved threads', () => {
    render(
      <CommentsPanel
        openThreads={openThreads}
        resolvedThreads={resolvedThreads}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={false}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText(`Resolved · ${resolvedThreads.length}`))
    expect(screen.getByText(/Comment t3/)).toBeInTheDocument()
    // Open threads no longer shown
    expect(screen.queryByText(/Comment t1/)).toBeNull()
  })

  it('shows empty state on Open tab when there are no open threads', () => {
    render(
      <CommentsPanel
        openThreads={[]}
        resolvedThreads={[]}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={false}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText(/no open comments/i)).toBeInTheDocument()
  })

  it('shows empty state on Resolved tab when there are no resolved threads', () => {
    render(
      <CommentsPanel
        openThreads={[]}
        resolvedThreads={[]}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={false}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Resolved · 0'))
    expect(screen.getByText(/no resolved comments/i)).toBeInTheDocument()
  })

  it('shows sign-in affordance when canComment is false', () => {
    const onSignIn = vi.fn()
    render(
      <CommentsPanel
        openThreads={[]}
        resolvedThreads={[]}
        canComment={false}
        onSignIn={onSignIn}
        canReply={false}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    const btn = screen.getByRole('button', { name: /sign in to comment/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onSignIn).toHaveBeenCalled()
  })

  it('onReply bubbles with the correct threadId', () => {
    const onReply = vi.fn()
    render(
      <CommentsPanel
        openThreads={[makeThread('t1', 'Alice')]}
        resolvedThreads={[]}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={true}
        canResolve={() => false}
        onReply={onReply}
        onResolve={vi.fn()}
      />,
    )
    const input = screen.getByPlaceholderText('Reply…')
    fireEvent.change(input, { target: { value: 'My reply' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(onReply).toHaveBeenCalledWith('t1', 'My reply')
  })

  it('onResolve bubbles with the correct threadId', () => {
    const onResolve = vi.fn()
    render(
      <CommentsPanel
        openThreads={[makeThread('t1', 'Alice')]}
        resolvedThreads={[]}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={false}
        canResolve={() => true}
        onReply={vi.fn()}
        onResolve={onResolve}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    expect(onResolve).toHaveBeenCalledWith('t1', true)
  })

  it('activeThreadId marks the matching thread as active', () => {
    render(
      <CommentsPanel
        openThreads={openThreads}
        resolvedThreads={[]}
        canComment={true}
        onSignIn={vi.fn()}
        activeThreadId="t2"
        canReply={false}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    const activeCard = document.querySelector('[data-thread-id="t2"]')
    expect(activeCard?.classList.contains('is-active')).toBe(true)
    const inactiveCard = document.querySelector('[data-thread-id="t1"]')
    expect(inactiveCard?.classList.contains('is-active')).toBe(false)
  })

  it('has root class CommentsPanel', () => {
    const { container } = render(
      <CommentsPanel
        openThreads={[]}
        resolvedThreads={[]}
        canComment={true}
        onSignIn={vi.fn()}
        canReply={false}
        canResolve={() => false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(container.firstChild).toHaveClass('CommentsPanel')
  })
})
