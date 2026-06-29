import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTextDoc } from '../../lib/doc-kind.js'
import { DocEditor } from './DocEditor.js'

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
})
