import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'

type ToolbarButtonsProps = {
  editor: Editor
  canFormat: boolean
  canComment: boolean
  onComment: () => void
}

/**
 * ToolbarButtons — the presentational button row.
 * Exported separately so it can be tested in jsdom without BubbleMenu/tippy
 * positioning constraints.
 */
export function ToolbarButtons({ editor, canFormat, canComment, onComment }: ToolbarButtonsProps) {
  const handleLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Enter URL', prev ?? '')
    if (url === null) return // prompt was cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  return (
    <div className="SelectionToolbar">
      {canFormat && (
        <>
          <button
            type="button"
            aria-label="Bold"
            aria-pressed={editor.isActive('bold')}
            className={`SelectionToolbar_btn SelectionToolbar_btn--bold${editor.isActive('bold') ? ' is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            aria-label="Italic"
            aria-pressed={editor.isActive('italic')}
            className={`SelectionToolbar_btn SelectionToolbar_btn--italic${editor.isActive('italic') ? ' is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            i
          </button>
          <button
            type="button"
            aria-label="Underline"
            aria-pressed={editor.isActive('underline')}
            className={`SelectionToolbar_btn SelectionToolbar_btn--underline${editor.isActive('underline') ? ' is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            U
          </button>
          <span className="SelectionToolbar_divider" aria-hidden="true" />
          <button
            type="button"
            aria-label="Link"
            aria-pressed={editor.isActive('link')}
            className={`SelectionToolbar_btn SelectionToolbar_btn--link${editor.isActive('link') ? ' is-active' : ''}`}
            onClick={handleLink}
          >
            Link
          </button>
          {canComment && <span className="SelectionToolbar_divider" aria-hidden="true" />}
        </>
      )}
      {canComment && (
        <button
          type="button"
          aria-label="Add comment"
          className="SelectionToolbar_comment"
          onClick={onComment}
        >
          + Comment
        </button>
      )}
    </div>
  )
}

type SelectionToolbarProps = {
  editor: Editor
  canFormat: boolean
  canComment: boolean
  onComment: () => void
}

/**
 * SelectionToolbar — wraps ToolbarButtons in a TipTap BubbleMenu that appears
 * on non-empty text selections.
 */
export function SelectionToolbar({ editor, canFormat, canComment, onComment }: SelectionToolbarProps) {
  return (
    <BubbleMenu editor={editor}>
      <ToolbarButtons
        editor={editor}
        canFormat={canFormat}
        canComment={canComment}
        onComment={onComment}
      />
    </BubbleMenu>
  )
}
