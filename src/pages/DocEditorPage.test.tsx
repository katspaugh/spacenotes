import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@supabase/auth-helpers-react'
import { createTextDoc } from '../lib/doc-kind.js'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api.js'
import { useComments } from '../hooks/useComments.js'
import type { CommentThread } from '../types/comment.js'
import { DocEditorPage } from './DocEditorPage.js'

vi.mock('@supabase/auth-helpers-react', () => ({
  useSession: vi.fn(),
}))

vi.mock('../lib/url.js', () => ({
  getUrlId: () => 'doc-1',
  setUrlId: vi.fn(),
}))

vi.mock('../lib/dinky-api.js', () => ({
  loadDoc: vi.fn(),
  saveDoc: vi.fn(),
  saveDocBeacon: vi.fn(),
}))

vi.mock('../components/Sidebar.js', () => ({
  Sidebar: () => null,
}))

vi.mock('../components/LoginModal.js', () => ({
  LoginModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Login Modal</div> : null,
}))

// Stub DocEditor to avoid TipTap JSDOM complexity in page-level tests.
// Exposes a button that fires onCreateComment with a fixed anchor so the
// page's "+ Comment" → composer flow is testable without the BubbleMenu.
vi.mock('../components/doc/DocEditor.js', () => ({
  DocEditor: ({
    doc,
    onCreateComment,
  }: {
    doc: { title?: string }
    onCreateComment?: (anchor: { from: number; to: number; quote: string }) => void
  }) => (
    <div data-testid="doc-editor-stub">
      {doc.title}
      <button
        type="button"
        onClick={() => onCreateComment?.({ from: 1, to: 5, quote: 'hell' })}
      >
        trigger-comment
      </button>
    </div>
  ),
}))

vi.mock('../hooks/useComments.js', () => ({
  useComments: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockThread: CommentThread = {
  root: {
    id: 'comment-1',
    docId: 'doc-1',
    threadId: 'thread-1',
    parentId: null,
    authorId: 'user-1',
    authorName: 'ivan',
    body: 'First comment',
    anchor: { from: 1, to: 5, quote: 'hell' },
    resolved: false,
    createdAt: new Date().toISOString(),
  },
  replies: [],
  resolved: false,
  outdated: false,
}

const mockReply = vi.fn().mockResolvedValue(undefined)
const mockResolve = vi.fn().mockResolvedValue(undefined)
const mockAddComment = vi.fn().mockResolvedValue(undefined)
const mockCanResolve = vi.fn().mockReturnValue(true)

function mockCommentsReturn(overrides: Partial<ReturnType<typeof useComments>> = {}) {
  vi.mocked(useComments).mockReturnValue({
    threads: [mockThread],
    openThreads: [mockThread],
    resolvedThreads: [],
    loading: false,
    error: null,
    addComment: mockAddComment,
    reply: mockReply,
    resolve: mockResolve,
    remove: vi.fn().mockResolvedValue(undefined),
    canResolve: mockCanResolve,
    ...overrides,
  })
}

function mockSignedInSession() {
  vi.mocked(useSession).mockReturnValue({
    access_token: 'token-1',
    user: { id: 'user-1', email: 'ivan@example.com' },
  } as ReturnType<typeof useSession>)
}

function mockAnonymousSession() {
  vi.mocked(useSession).mockReturnValue(null)
}

// ---------------------------------------------------------------------------
// Header tests (original suite)
// ---------------------------------------------------------------------------

describe('DocEditorPage header', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-06-30T12:00:00Z'))

    mockSignedInSession()
    // Use empty threads so no comment-author text conflicts with header-author text
    mockCommentsReturn({ threads: [], openThreads: [], resolvedThreads: [] })

    vi.mocked(loadDoc).mockResolvedValue({
      ...createTextDoc('doc-1', 'user-1'),
      title: 'Web wallet architecture',
    })
    vi.mocked(saveDoc).mockResolvedValue({ status: 200, key: 'doc-1' })
    vi.mocked(saveDocBeacon).mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the document title in the header once the doc loads', async () => {
    render(<DocEditorPage />)

    // findBy* waits for async state updates; stays act-clean
    const titleInput = await screen.findByRole('textbox', { name: 'Document title' })
    expect(titleInput).toHaveValue('Web wallet architecture')
  })

  it('renders the edited date in the byline', async () => {
    render(<DocEditorPage />)

    // Date is 2026-06-30 via faked timer
    const dateEl = await screen.findByText(/edited 2026-06-30/)
    expect(dateEl).toBeInTheDocument()
  })

  it('renders the breadcrumb with "spaces" and the document title', async () => {
    render(<DocEditorPage />)

    const breadcrumb = await screen.findByText(/spaces/)
    expect(breadcrumb).toBeInTheDocument()
    // The breadcrumb contains the doc title as a strong element
    expect(breadcrumb.textContent).toMatch(/Web wallet architecture/)
  })

  it('shows the author derived from the session email local-part', async () => {
    render(<DocEditorPage />)

    const author = await screen.findByText('ivan')
    expect(author).toBeInTheDocument()
  })

  it('shows loading state before doc is available', () => {
    // loadDoc never resolves in this test
    vi.mocked(loadDoc).mockReturnValue(new Promise(() => undefined))

    render(<DocEditorPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows error state when useTextDocState reports an error', async () => {
    vi.mocked(loadDoc).mockResolvedValue({
      // not a text doc — triggers the "wrong kind" error path
      id: 'doc-1',
      kind: 'space',
      version: 2,
      lastSequence: 0,
      nodes: [],
      edges: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    render(<DocEditorPage />)

    const error = await screen.findByText(/could not be opened/)
    expect(error).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Comments integration tests
// ---------------------------------------------------------------------------

describe('DocEditorPage comments', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    vi.mocked(loadDoc).mockResolvedValue({
      ...createTextDoc('doc-1', 'user-1'),
      title: 'Test Doc',
    })
    vi.mocked(saveDoc).mockResolvedValue({ status: 200, key: 'doc-1' })
    vi.mocked(saveDocBeacon).mockReturnValue(undefined)
    mockReply.mockClear()
    mockResolve.mockClear()
    mockAddComment.mockClear()
    mockCanResolve.mockClear()
    mockCanResolve.mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders CommentsPanel with open threads from the hook', async () => {
    mockSignedInSession()
    mockCommentsReturn()

    render(<DocEditorPage />)

    await screen.findByRole('textbox', { name: 'Document title' })

    // The thread body text should appear in the CommentsPanel
    expect(screen.getByTestId('comment-body')).toHaveTextContent('First comment')
  })

  it('shows "Sign in to comment" button for anonymous viewers', async () => {
    mockAnonymousSession()
    mockCommentsReturn()

    render(<DocEditorPage />)

    await screen.findByRole('textbox', { name: 'Document title' })

    expect(screen.getByRole('button', { name: /sign in to comment/i })).toBeInTheDocument()
  })

  it('clicking "Sign in to comment" opens the LoginModal', async () => {
    mockAnonymousSession()
    mockCommentsReturn()

    render(<DocEditorPage />)

    await screen.findByRole('textbox', { name: 'Document title' })

    fireEvent.click(screen.getByRole('button', { name: /sign in to comment/i }))

    expect(screen.getByText('Login Modal')).toBeInTheDocument()
  })

  it('reply from CommentsPanel calls hook reply with the correct threadId and body', async () => {
    mockSignedInSession()
    mockCommentsReturn()

    render(<DocEditorPage />)

    await screen.findByRole('textbox', { name: 'Document title' })

    const replyInput = screen.getByLabelText('Write a reply')
    fireEvent.change(replyInput, { target: { value: 'A reply text' } })
    fireEvent.keyDown(replyInput, { key: 'Enter' })

    expect(mockReply).toHaveBeenCalledWith('thread-1', 'A reply text')
  })

  it('resolve button from CommentsPanel calls hook resolve with the correct threadId', async () => {
    mockSignedInSession()
    mockCommentsReturn()

    render(<DocEditorPage />)

    await screen.findByRole('textbox', { name: 'Document title' })

    const resolveBtn = screen.getByRole('button', { name: 'Resolve' })
    fireEvent.click(resolveBtn)

    expect(mockResolve).toHaveBeenCalledWith('thread-1', true)
  })

  it('clicking "+ Comment" while signed in opens the inline composer (no window.prompt)', async () => {
    mockSignedInSession()
    mockCommentsReturn()

    render(<DocEditorPage />)
    await screen.findByRole('textbox', { name: 'Document title' })

    // Composer is not shown until "+ Comment" fires
    expect(screen.queryByLabelText('Comment text')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'trigger-comment' }))

    expect(screen.getByLabelText('Comment text')).toBeInTheDocument()
  })

  it('posting from the composer calls addComment with the anchor and body', async () => {
    mockSignedInSession()
    mockCommentsReturn()

    render(<DocEditorPage />)
    await screen.findByRole('textbox', { name: 'Document title' })

    fireEvent.click(screen.getByRole('button', { name: 'trigger-comment' }))
    const input = screen.getByLabelText('Comment text')
    fireEvent.change(input, { target: { value: 'A new comment' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comment' }))

    expect(mockAddComment).toHaveBeenCalledWith(
      { from: 1, to: 5, quote: 'hell' },
      'A new comment',
    )
    // Composer closes after posting
    expect(screen.queryByLabelText('Comment text')).toBeNull()
  })

  it('cancelling the composer discards it without calling addComment', async () => {
    mockSignedInSession()
    mockCommentsReturn()

    render(<DocEditorPage />)
    await screen.findByRole('textbox', { name: 'Document title' })

    fireEvent.click(screen.getByRole('button', { name: 'trigger-comment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('Comment text')).toBeNull()
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('clicking "+ Comment" while anonymous opens the LoginModal instead of a composer', async () => {
    mockAnonymousSession()
    mockCommentsReturn()

    render(<DocEditorPage />)
    await screen.findByRole('textbox', { name: 'Document title' })

    fireEvent.click(screen.getByRole('button', { name: 'trigger-comment' }))

    expect(screen.getByText('Login Modal')).toBeInTheDocument()
    expect(screen.queryByLabelText('Comment text')).toBeNull()
  })

  it('does not render the comments panel for an anonymous viewer with no comments', async () => {
    mockAnonymousSession()
    mockCommentsReturn({ threads: [], openThreads: [], resolvedThreads: [] })

    render(<DocEditorPage />)
    await screen.findByRole('textbox', { name: 'Document title' })

    // No panel → no "Sign in to comment" affordance and the paper stays centered
    expect(screen.queryByRole('button', { name: /sign in to comment/i })).toBeNull()
  })

  it('renders the resolved tab when there are resolved threads', async () => {
    const resolvedThread: CommentThread = {
      ...mockThread,
      root: { ...mockThread.root, threadId: 'thread-2', resolved: true },
      resolved: true,
    }
    mockSignedInSession()
    mockCommentsReturn({
      openThreads: [],
      resolvedThreads: [resolvedThread],
      threads: [resolvedThread],
    })

    render(<DocEditorPage />)

    await screen.findByRole('textbox', { name: 'Document title' })

    // The resolved tab counter should show 1
    expect(screen.getByRole('button', { name: /resolved · 1/i })).toBeInTheDocument()
  })
})
