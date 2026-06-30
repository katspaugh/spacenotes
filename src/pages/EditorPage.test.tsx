import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDoc } from '../lib/dinky-api.js'
import { createTextDoc } from '../lib/doc-kind.js'
import { EditorPage } from './EditorPage.js'

vi.mock('../lib/dinky-api.js', () => ({
  loadDoc: vi.fn(),
}))

vi.mock('../components/Editor.js', () => ({
  Editor: () => <div data-testid="space-editor" />,
}))

vi.mock('../context/DocumentContext.js', () => ({
  DocumentProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="document-provider">{children}</div>,
}))

vi.mock('./DocEditorPage.js', () => ({
  DocEditorPage: () => <div data-testid="doc-editor-page" />,
}))

describe('EditorPage routing', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost/?q=doc-1')
    vi.mocked(loadDoc).mockReset()
  })

  it('routes loaded text docs to DocEditorPage', async () => {
    vi.mocked(loadDoc).mockResolvedValue(createTextDoc('doc-1'))

    render(<EditorPage />)

    await waitFor(() => expect(screen.getByTestId('doc-editor-page')).toBeInTheDocument())
  })

  it('routes loaded spaces to the existing Editor inside DocumentProvider', async () => {
    vi.mocked(loadDoc).mockResolvedValue({
      id: 'space-1',
      kind: 'space',
      version: 2,
      lastSequence: 0,
      nodes: [],
      edges: [],
    })

    render(<EditorPage />)

    await waitFor(() => expect(screen.getByTestId('document-provider')).toBeInTheDocument())
    expect(screen.getByTestId('space-editor')).toBeInTheDocument()
  })

  it('routes new document URLs to DocEditorPage without an existing row', async () => {
    window.history.replaceState({}, '', 'http://localhost/?q=doc-new&kind=doc')
    vi.mocked(loadDoc).mockRejectedValue(new Error('Document not found'))

    render(<EditorPage />)

    await waitFor(() => expect(screen.getByTestId('doc-editor-page')).toBeInTheDocument())
  })
})
