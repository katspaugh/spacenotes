import { useCallback, useState } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import { getUrlId } from '../lib/url.js'
import { DocEditor } from '../components/doc/DocEditor.js'
import { CommentsPanel } from '../components/doc/CommentsPanel.js'
import { LoginModal } from '../components/LoginModal.js'
import { Sidebar } from '../components/Sidebar.js'
import { useTextDocState } from '../hooks/useTextDocState.js'
import { useComments } from '../hooks/useComments.js'
import type { CommentAnchor } from '../types/comment.js'
import '../components/doc/doc-editor.css'

function formatEditedDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function DocEditorPage() {
  const id = getUrlId()
  const state = useTextDocState(id)
  const session = useSession()
  const comments = useComments(id, state.doc?.userId)

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined)
  const [pendingAnchor, setPendingAnchor] = useState<CommentAnchor | null>(null)
  const [draftBody, setDraftBody] = useState('')

  const isSignedIn = !!session?.user?.id

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((open) => !open)
  }, [])

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  const openLoginModal = useCallback(() => {
    setIsLoginModalOpen(true)
  }, [])

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false)
  }, [])

  const handleLoginSuccess = useCallback(() => {
    setIsLoginModalOpen(false)
    state.onPostLoginSave()
  }, [state])

  const { addComment, reply, resolve } = comments

  // "+ Comment" starts an inline composer anchored to the current selection.
  const handleCreateComment = useCallback(
    (anchor: CommentAnchor) => {
      if (!isSignedIn) {
        setIsLoginModalOpen(true)
        return
      }
      setPendingAnchor(anchor)
      setDraftBody('')
    },
    [isSignedIn],
  )

  const submitComment = useCallback(() => {
    if (!pendingAnchor) return
    const body = draftBody.trim()
    if (!body) return
    void addComment(pendingAnchor, body)
    setPendingAnchor(null)
    setDraftBody('')
  }, [pendingAnchor, draftBody, addComment])

  const cancelComment = useCallback(() => {
    setPendingAnchor(null)
    setDraftBody('')
  }, [])

  const handleReply = useCallback(
    (threadId: string, body: string) => {
      void reply(threadId, body)
    },
    [reply],
  )

  const handleResolve = useCallback(
    (threadId: string, resolved: boolean) => {
      void resolve(threadId, resolved)
    },
    [resolve],
  )

  if (state.error) {
    return <div className="DocEditorPage_error">{state.error}</div>
  }

  if (state.isLoading || !state.doc) {
    return <div className="DocEditorPage_loading">Loading...</div>
  }

  const doc = state.doc
  const userEmail = session?.user?.email ?? ''
  const authorName = userEmail ? userEmail.split('@')[0] : 'Anonymous'
  const initials = authorName.slice(0, 2).toUpperCase()
  const editedDate = formatEditedDate(new Date())
  const docTitle = doc.title || 'Untitled document'

  return (
    <>
      <button
        className="Board_menuButton DocPage_menuBtn"
        type="button"
        onClick={toggleSidebar}
        aria-label="Open menu"
      >
        Menu
      </button>

      <div className="DocPage">
        <div className="DocPage_layout">
          <article className="DocPaper">
            <header className="DocHeader">
              <p className="DocHeader_breadcrumb">
                spaces / <strong>{docTitle}</strong>
              </p>

              <div className="DocHeader_titleWrapper">
                <input
                  className="DocHeader_titleInput"
                  aria-label="Document title"
                  disabled={state.isLocked}
                  placeholder="Untitled document"
                  value={doc.title ?? ''}
                  onChange={(e) => state.onTitleChange(e.target.value)}
                />
              </div>

              <div className="DocHeader_byline">
                <span className="DocHeader_avatar" aria-hidden="true">
                  {initials}
                </span>
                <span className="DocHeader_author">{authorName}</span>
                <span className="DocHeader_date">· edited {editedDate}</span>
              </div>

              <hr className="DocHeader_hr" />
            </header>

            <DocEditor
              doc={doc}
              editable={!state.isLocked}
              onTitleChange={state.onTitleChange}
              onContentChange={state.onContentChange}
              renderTitle={false}
              threads={comments.threads}
              canComment={isSignedIn}
              onCreateComment={handleCreateComment}
              onFocusThread={setActiveThreadId}
            />
          </article>

          {(isSignedIn || comments.threads.length > 0) && (
            <div className="DocComments">
              {pendingAnchor && (
                <div className="CommentComposer">
                  {pendingAnchor.quote && (
                    <p className="CommentComposer_quote">“{pendingAnchor.quote}”</p>
                  )}
                  <textarea
                    className="CommentComposer_input"
                    aria-label="Comment text"
                    placeholder="Add a comment…"
                    autoFocus
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        submitComment()
                      } else if (e.key === 'Escape') {
                        cancelComment()
                      }
                    }}
                  />
                  <div className="CommentComposer_actions">
                    <button
                      type="button"
                      className="CommentComposer_cancel"
                      onClick={cancelComment}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="CommentComposer_post"
                      disabled={!draftBody.trim()}
                      onClick={submitComment}
                    >
                      Comment
                    </button>
                  </div>
                </div>
              )}

              <CommentsPanel
                openThreads={comments.openThreads}
                resolvedThreads={comments.resolvedThreads}
                canComment={isSignedIn}
                onSignIn={openLoginModal}
                activeThreadId={activeThreadId}
                canReply={isSignedIn}
                canResolve={comments.canResolve}
                onReply={handleReply}
                onResolve={handleResolve}
                onFocusThread={setActiveThreadId}
              />
            </div>
          )}
        </div>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onFork={() => undefined}
        isLocked={state.isLocked}
        onShareSession={() => undefined}
        isOwner={state.isOwner}
        onSignIn={openLoginModal}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </>
  )
}
