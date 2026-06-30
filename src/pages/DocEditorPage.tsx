import { useCallback, useState } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import { getUrlId } from '../lib/url.js'
import { DocEditor } from '../components/doc/DocEditor.js'
import { LoginModal } from '../components/LoginModal.js'
import { Sidebar } from '../components/Sidebar.js'
import { useTextDocState } from '../hooks/useTextDocState.js'
import '../components/doc/doc-editor.css'

function formatEditedDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function DocEditorPage() {
  const id = getUrlId()
  const state = useTextDocState(id)
  const session = useSession()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

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
          />
        </article>
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
