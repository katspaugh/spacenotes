import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CommentThread } from '../../types/comment.js'
import { CommentThreadCard } from './CommentThread.js'

const NOW_ISO = '2025-06-01T12:00:00Z'

function makeThread(overrides: Partial<CommentThread> = {}): CommentThread {
  return {
    root: {
      id: 'c1',
      docId: 'doc-1',
      threadId: 'thread-1',
      parentId: null,
      authorId: 'user-1',
      authorName: 'Maya Reyes',
      body: 'Hello **world**',
      anchor: { from: 0, to: 10, quote: 'Some text' },
      resolved: false,
      createdAt: NOW_ISO,
    },
    replies: [],
    resolved: false,
    outdated: false,
    ...overrides,
  }
}

describe('CommentThreadCard', () => {
  it('renders the author name and relative time', () => {
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={true}
        canResolve={true}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText('Maya Reyes')).toBeInTheDocument()
    // relativeTime will show "just now" for the NOW_ISO if run quickly,
    // but since we use the real clock we just check the element exists
    // (relativeTime returns "just now", "Xm", etc.)
    expect(screen.getByTestId('comment-time')).toBeInTheDocument()
  })

  it('renders the sanitized body as HTML (markdown bold → <b>)', () => {
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={true}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    // sanitizeHtml runs the markdown helper, so **world** → <b>world</b>
    const body = screen.getByTestId('comment-body')
    expect(body.querySelector('b')).not.toBeNull()
    expect(body.textContent).toContain('world')
  })

  it('strips <script> tags from body (XSS sanitization)', () => {
    const thread = makeThread({
      root: {
        ...makeThread().root,
        body: 'Safe text <script>alert("xss")</script>',
      },
    })
    render(
      <CommentThreadCard
        thread={thread}
        canReply={true}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    const body = screen.getByTestId('comment-body')
    expect(body.querySelector('script')).toBeNull()
    expect(body.textContent).toContain('Safe text')
  })

  it('renders flat replies with author name and body', () => {
    const thread = makeThread({
      replies: [
        {
          id: 'r1',
          docId: 'doc-1',
          threadId: 'thread-1',
          parentId: 'c1',
          authorId: 'user-2',
          authorName: 'Ivan',
          body: 'Good call!',
          anchor: null,
          resolved: false,
          createdAt: NOW_ISO,
        },
      ],
    })
    render(
      <CommentThreadCard
        thread={thread}
        canReply={true}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText(/Ivan/)).toBeInTheDocument()
    expect(screen.getByText(/Good call!/)).toBeInTheDocument()
  })

  it('escapes a reply author name containing HTML (no injection)', () => {
    const thread = makeThread({
      replies: [
        {
          id: 'r1',
          docId: 'doc-1',
          threadId: 'thread-1',
          parentId: 'c1',
          authorId: 'user-2',
          authorName: '<img src=x onerror="alert(1)">',
          body: 'reply body',
          anchor: null,
          resolved: false,
          createdAt: NOW_ISO,
        },
      ],
    })
    const { container } = render(
      <CommentThreadCard
        thread={thread}
        canReply={true}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    // The name is rendered as escaped JSX text, not parsed into an <img> element
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText(/onerror/)).toBeInTheDocument()
  })

  it('Reply input calls onReply with typed text on Enter', () => {
    const onReply = vi.fn()
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={true}
        canResolve={false}
        onReply={onReply}
        onResolve={vi.fn()}
      />,
    )
    const input = screen.getByPlaceholderText('Reply…')
    fireEvent.change(input, { target: { value: 'A reply text' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(onReply).toHaveBeenCalledWith('A reply text')
    // input should be cleared
    expect(input).toHaveValue('')
  })

  it('Reply input is not shown when canReply is false', () => {
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={false}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.queryByPlaceholderText('Reply…')).toBeNull()
  })

  it('Resolve button is shown when canResolve is true and calls onResolve(true)', () => {
    const onResolve = vi.fn()
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={false}
        canResolve={true}
        onReply={vi.fn()}
        onResolve={onResolve}
      />,
    )
    const btn = screen.getByRole('button', { name: /resolve/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onResolve).toHaveBeenCalledWith(true)
  })

  it('Resolve button is NOT shown when canResolve is false', () => {
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={false}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /resolve/i })).toBeNull()
  })

  it('shows Unresolve button for already-resolved thread', () => {
    const onResolve = vi.fn()
    const thread = makeThread({ resolved: true })
    render(
      <CommentThreadCard
        thread={thread}
        canReply={false}
        canResolve={true}
        onReply={vi.fn()}
        onResolve={onResolve}
      />,
    )
    const btn = screen.getByRole('button', { name: /unresolve/i })
    fireEvent.click(btn)
    expect(onResolve).toHaveBeenCalledWith(false)
  })

  it('shows RESOLVED badge when thread is resolved', () => {
    render(
      <CommentThreadCard
        thread={makeThread({ resolved: true })}
        canReply={false}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText('RESOLVED')).toBeInTheDocument()
  })

  it('applies is-resolved class when resolved', () => {
    render(
      <CommentThreadCard
        thread={makeThread({ resolved: true })}
        canReply={false}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    // The root element has data-thread-id and class
    const card = document.querySelector('[data-thread-id="thread-1"]')
    expect(card?.classList.contains('is-resolved')).toBe(true)
  })

  it('applies is-active class when active prop is true', () => {
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={false}
        canResolve={false}
        active={true}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    const card = document.querySelector('[data-thread-id="thread-1"]')
    expect(card?.classList.contains('is-active')).toBe(true)
  })

  it('shows "content changed" flag when outdated', () => {
    render(
      <CommentThreadCard
        thread={makeThread({ outdated: true })}
        canReply={false}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(screen.getByText(/content changed/i)).toBeInTheDocument()
  })

  it('clicking the card body calls onFocus', () => {
    const onFocus = vi.fn()
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={false}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
        onFocus={onFocus}
      />,
    )
    const body = screen.getByTestId('comment-body')
    fireEvent.click(body)
    expect(onFocus).toHaveBeenCalled()
  })

  it('sets data-thread-id on root element', () => {
    render(
      <CommentThreadCard
        thread={makeThread()}
        canReply={false}
        canResolve={false}
        onReply={vi.fn()}
        onResolve={vi.fn()}
      />,
    )
    expect(document.querySelector('[data-thread-id="thread-1"]')).toBeInTheDocument()
  })
})
