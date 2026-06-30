import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTextDoc } from '../../lib/doc-kind.js'
import { DocEditor } from './DocEditor.js'
import type { TipTapJSON } from '../../types/doc.js'

describe('DocEditor', () => {
  it('renders title input and editable TipTap region for owners', () => {
    const onTitleChange = vi.fn()
    const onContentChange = vi.fn()
    const doc = { ...createTextDoc('doc-1'), title: 'RFC Draft' }

    render(
      <DocEditor
        doc={doc}
        editable={true}
        onTitleChange={onTitleChange}
        onContentChange={onContentChange}
      />,
    )

    const title = screen.getByLabelText('Document title')
    fireEvent.change(title, { target: { value: 'Updated RFC' } })

    expect(title).toHaveValue('Updated RFC')
    expect(onTitleChange).toHaveBeenCalledWith('Updated RFC')
    expect(screen.getByTestId('doc-editor-content')).toHaveAttribute('contenteditable', 'true')
  })

  it('renders read-only controls for non-owners', () => {
    const doc = { ...createTextDoc('doc-1'), title: 'Read Only RFC' }

    render(
      <DocEditor
        doc={doc}
        editable={false}
        onTitleChange={vi.fn()}
        onContentChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Document title')).toBeDisabled()
    expect(screen.getByTestId('doc-editor-content')).toHaveAttribute('contenteditable', 'false')
  })

  it('syncs the title input when the doc.title prop changes', () => {
    const doc = { ...createTextDoc('doc-1'), title: 'First' }
    const { rerender } = render(
      <DocEditor
        doc={doc}
        editable={true}
        onTitleChange={vi.fn()}
        onContentChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Document title')).toHaveValue('First')
    rerender(
      <DocEditor
        doc={{ ...doc, title: 'Second' }}
        editable={true}
        onTitleChange={vi.fn()}
        onContentChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Document title')).toHaveValue('Second')
  })

  it('renders a link mark from initial content (link extension active)', async () => {
    const content: TipTapJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'link', attrs: { href: 'https://example.com', target: '_blank' } }],
              text: 'Click here',
            },
          ],
        },
      ],
    }
    const doc = { ...createTextDoc('doc-2'), content }

    render(
      <DocEditor
        doc={doc}
        editable={true}
        onTitleChange={vi.fn()}
        onContentChange={vi.fn()}
      />,
    )

    const link = await screen.findByRole('link', { name: 'Click here' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('renders an underline mark from initial content (underline extension active)', async () => {
    const content: TipTapJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'underline' }],
              text: 'Underlined text',
            },
          ],
        },
      ],
    }
    const doc = { ...createTextDoc('doc-3'), content }

    render(
      <DocEditor
        doc={doc}
        editable={false}
        onTitleChange={vi.fn()}
        onContentChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      const editorContent = screen.getByTestId('doc-editor-content')
      expect(editorContent).toHaveAttribute('contenteditable', 'false')
      const underlined = editorContent.querySelector('u')
      expect(underlined).not.toBeNull()
      expect(underlined?.textContent).toBe('Underlined text')
    })
  })
})
