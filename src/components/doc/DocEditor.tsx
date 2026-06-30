import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { TextDocData, TipTapJSON } from '../../types/doc.js'
import { SelectionToolbar } from './SelectionToolbar.js'

type DocEditorProps = {
  doc: TextDocData
  editable: boolean
  onTitleChange: (title: string) => void
  onContentChange: (content: TipTapJSON) => void
  renderTitle?: boolean
  /** Called when the user clicks "+ Comment" in the selection toolbar. Wired in Task 8. */
  onComment?: () => void
}

export function DocEditor({ doc, editable, onTitleChange, onContentChange, renderTitle = true, onComment = () => {} }: DocEditorProps) {
  const [title, setTitle] = useState(doc.title ?? '')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
        underline: {},
      }),
    ],
    content: doc.content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'data-testid': 'doc-editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON() as TipTapJSON)
    },
  })

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor) return
    const current = editor.getJSON()
    if (JSON.stringify(current) !== JSON.stringify(doc.content)) {
      editor.commands.setContent(doc.content)
    }
  }, [editor, doc.content])

  useEffect(() => {
    setTitle(doc.title ?? '')
  }, [doc.title])

  return (
    <main className="DocEditor">
      {renderTitle && (
        <input
          aria-label="Document title"
          className="DocEditor_title"
          disabled={!editable}
          placeholder="Untitled document"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            onTitleChange(event.target.value)
          }}
        />
      )}
      {editor && (
        <SelectionToolbar
          editor={editor}
          canFormat={editable}
          // TODO(Task 8): canComment should become true for any signed-in viewer, not just the owner
          canComment={editable}
          onComment={onComment}
        />
      )}
      <EditorContent
        className="DocEditor_content"
        editor={editor}
      />
    </main>
  )
}
