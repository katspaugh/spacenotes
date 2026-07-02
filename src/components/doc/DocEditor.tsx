import { useCallback, useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { TextDocData, TipTapJSON } from '../../types/doc.js'
import type { CommentAnchor, CommentThread } from '../../types/comment.js'
import { SelectionToolbar } from './SelectionToolbar.js'
import { CommentDecorations, setCommentThreads } from './CommentExtension.js'

type DocEditorProps = {
  doc: TextDocData
  editable: boolean
  onTitleChange: (title: string) => void
  onContentChange: (content: TipTapJSON) => void
  renderTitle?: boolean
  threads?: CommentThread[]
  canComment?: boolean
  onCreateComment?: (anchor: CommentAnchor) => void
  onFocusThread?: (threadId: string) => void
}

export function DocEditor({
  doc,
  editable,
  onTitleChange,
  onContentChange,
  renderTitle = true,
  threads = [],
  canComment = false,
  onCreateComment = () => {},
  onFocusThread,
}: DocEditorProps) {
  const [title, setTitle] = useState(doc.title ?? '')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
        underline: {},
      }),
      CommentDecorations,
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

  // NOTE: outdated re-anchoring deferred — anchors are PM positions; reanchorThreads is plain-text (coordinate reconciliation is a follow-up)
  useEffect(() => {
    if (!editor) return
    setCommentThreads(editor, threads)
  }, [editor, threads])

  // Listen for clicks on comment decoration elements (.cmt-highlight, .cmt-badge)
  // and forward the thread-id to the onFocusThread callback so clicking a highlight
  // scrolls/focuses the corresponding panel thread.
  useEffect(() => {
    if (!editor || !onFocusThread) return
    const dom = editor.view.dom
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const decorated = target.closest('[data-thread-id]') as HTMLElement | null
      if (decorated) {
        const threadId = decorated.dataset['threadId']
        if (threadId) onFocusThread!(threadId)
      }
    }
    dom.addEventListener('click', handleClick)
    return () => dom.removeEventListener('click', handleClick)
  }, [editor, onFocusThread])

  const handleComment = useCallback(() => {
    if (!editor) return
    const { from, to, empty } = editor.state.selection
    if (empty) return
    const quote = editor.state.doc.textBetween(from, to, ' ')
    onCreateComment({ from, to, quote })
  }, [editor, onCreateComment])

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
          canComment={canComment}
          onComment={handleComment}
        />
      )}
      <EditorContent
        className="DocEditor_content"
        editor={editor}
      />
    </main>
  )
}
