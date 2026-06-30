import { render, screen } from '@testing-library/react'
import { useSession } from '@supabase/auth-helpers-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listDocsPage } from '../lib/dinky-api.js'
import { Sidebar } from './Sidebar.js'

vi.mock('@supabase/auth-helpers-react', () => ({
  useSession: vi.fn(),
}))

vi.mock('../services/supabaseService.js', () => ({
  signOut: vi.fn(),
}))

vi.mock('../lib/dinky-api.js', () => ({
  listDocsPage: vi.fn(),
}))

describe('Sidebar document kinds', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 'user-1', email: 'ada@example.com' },
    } as ReturnType<typeof useSession>)
    vi.mocked(listDocsPage).mockResolvedValue({
      total: 2,
      spaces: [
        { id: 'space-1', title: 'Canvas', kind: 'space' },
        { id: 'doc-1', title: 'RFC', kind: 'doc' },
      ],
    })
  })

  it('offers separate new Space and Document links', async () => {
    render(
      <Sidebar
        isOpen={true}
        onClose={vi.fn()}
        onFork={vi.fn()}
        onShareSession={vi.fn()}
        isOwner={true}
        onSignIn={vi.fn()}
      />,
    )

    expect(await screen.findByRole('link', { name: 'New space' })).toHaveAttribute('href', expect.not.stringContaining('kind=doc'))
    expect(screen.getByRole('link', { name: 'New document' })).toHaveAttribute('href', expect.stringContaining('kind=doc'))

  })

  it('renders kind-specific labels in the document list', async () => {
    render(
      <Sidebar
        isOpen={true}
        onClose={vi.fn()}
        onFork={vi.fn()}
        onShareSession={vi.fn()}
        isOwner={true}
        onSignIn={vi.fn()}
      />,
    )

    await screen.findByText('Canvas')

    expect(screen.getByLabelText('Space')).toBeInTheDocument()
    expect(screen.getByLabelText('Document')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /RFC/ })).toHaveAttribute('href', expect.stringContaining('kind=doc'))
  })
})
