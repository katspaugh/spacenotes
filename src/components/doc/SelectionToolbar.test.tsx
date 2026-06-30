import { fireEvent, render, screen } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { describe, expect, it, vi } from 'vitest'
import { ToolbarButtons } from './SelectionToolbar.js'

/**
 * Build a fluent editor mock with spy methods.
 * The chain pattern is:
 *   editor.chain().focus().toggleBold().run()
 *   editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
 */
function makeEditorMock({
  boldActive = false,
  italicActive = false,
  underlineActive = false,
  linkActive = false,
} = {}) {
  const run = vi.fn()

  const formatCommands = {
    toggleBold: vi.fn(() => ({ run })),
    toggleItalic: vi.fn(() => ({ run })),
    toggleUnderline: vi.fn(() => ({ run })),
    setLink: vi.fn(() => ({ run })),
    unsetLink: vi.fn(() => ({ run })),
  }

  const extendMarkRange = vi.fn(() => formatCommands)
  const focus = vi.fn(() => ({ ...formatCommands, extendMarkRange }))
  const chain = vi.fn(() => ({ focus }))

  const isActive = vi.fn((mark: string) => {
    if (mark === 'bold') return boldActive
    if (mark === 'italic') return italicActive
    if (mark === 'underline') return underlineActive
    if (mark === 'link') return linkActive
    return false
  })

  const getAttributes = vi.fn(() => ({ href: '' }))

  return {
    chain,
    isActive,
    getAttributes,
    _spies: { run, ...formatCommands, extendMarkRange, focus },
  }
}

describe('ToolbarButtons', () => {
  it('shows formatting buttons when canFormat=true', () => {
    const editor = makeEditorMock()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument()
  })

  it('hides formatting buttons when canFormat=false', () => {
    const editor = makeEditorMock()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={false}
        canComment={true}
        onComment={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Bold' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Italic' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Underline' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Link' })).not.toBeInTheDocument()
  })

  it('shows "+ Comment" button when canComment=true', () => {
    const editor = makeEditorMock()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={false}
        canComment={true}
        onComment={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add comment' })).toBeInTheDocument()
  })

  it('hides "+ Comment" button when canComment=false', () => {
    const editor = makeEditorMock()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Add comment' })).not.toBeInTheDocument()
  })

  it('clicking Bold calls toggleBold().run()', () => {
    const editor = makeEditorMock()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(editor.chain).toHaveBeenCalled()
    expect(editor._spies.focus).toHaveBeenCalled()
    expect(editor._spies.toggleBold).toHaveBeenCalled()
    expect(editor._spies.run).toHaveBeenCalled()
  })

  it('clicking Italic calls toggleItalic().run()', () => {
    const editor = makeEditorMock()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Italic' }))
    expect(editor._spies.toggleItalic).toHaveBeenCalled()
    expect(editor._spies.run).toHaveBeenCalled()
  })

  it('clicking Underline calls toggleUnderline().run()', () => {
    const editor = makeEditorMock()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Underline' }))
    expect(editor._spies.toggleUnderline).toHaveBeenCalled()
    expect(editor._spies.run).toHaveBeenCalled()
  })

  it('clicking "+ Comment" calls onComment callback', () => {
    const editor = makeEditorMock()
    const onComment = vi.fn()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={false}
        canComment={true}
        onComment={onComment}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))
    expect(onComment).toHaveBeenCalledTimes(1)
  })

  it('Bold button has is-active class and aria-pressed=true when bold is active', () => {
    const editor = makeEditorMock({ boldActive: true })
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    const boldBtn = screen.getByRole('button', { name: 'Bold' })
    expect(boldBtn).toHaveClass('is-active')
    expect(boldBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('Bold button does not have is-active class when bold is inactive', () => {
    const editor = makeEditorMock({ boldActive: false })
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    const boldBtn = screen.getByRole('button', { name: 'Bold' })
    expect(boldBtn).not.toHaveClass('is-active')
    expect(boldBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking Link with a URL calls setLink().run()', () => {
    const editor = makeEditorMock()
    vi.spyOn(window, 'prompt').mockReturnValueOnce('https://example.com')
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Link' }))
    expect(editor._spies.extendMarkRange).toHaveBeenCalledWith('link')
    expect(editor._spies.setLink).toHaveBeenCalledWith({ href: 'https://example.com' })
    expect(editor._spies.run).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('clicking Link with empty string calls unsetLink().run()', () => {
    const editor = makeEditorMock()
    vi.spyOn(window, 'prompt').mockReturnValueOnce('')
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Link' }))
    expect(editor._spies.unsetLink).toHaveBeenCalled()
    expect(editor._spies.run).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('clicking Link when prompt is cancelled does nothing', () => {
    const editor = makeEditorMock()
    vi.spyOn(window, 'prompt').mockReturnValueOnce(null)
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={false}
        onComment={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Link' }))
    expect(editor._spies.run).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('shows both formatting and comment button together', () => {
    const editor = makeEditorMock()
    render(
      <ToolbarButtons
        editor={editor as unknown as Editor}
        canFormat={true}
        canComment={true}
        onComment={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add comment' })).toBeInTheDocument()
  })
})
