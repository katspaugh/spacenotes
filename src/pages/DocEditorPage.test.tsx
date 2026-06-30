import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@supabase/auth-helpers-react'
import { createTextDoc } from '../lib/doc-kind.js'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api.js'
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
  LoginModal: () => null,
}))

// Stub DocEditor to avoid TipTap JSDOM complexity in page-level tests
vi.mock('../components/doc/DocEditor.js', () => ({
  DocEditor: ({ doc }: { doc: { title?: string } }) => (
    <div data-testid="doc-editor-stub">{doc.title}</div>
  ),
}))

describe('DocEditorPage header', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-06-30T12:00:00Z'))

    vi.mocked(useSession).mockReturnValue({
      access_token: 'token-1',
      user: { id: 'user-1', email: 'ivan@example.com' },
    } as ReturnType<typeof useSession>)

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
