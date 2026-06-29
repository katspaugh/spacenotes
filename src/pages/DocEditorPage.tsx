import { useCallback, useState } from 'react'
import { getUrlId } from '../lib/url.js'
import { DocEditor } from '../components/doc/DocEditor.js'
import { LoginModal } from '../components/LoginModal.js'
import { Sidebar } from '../components/Sidebar.js'
import { useTextDocState } from '../hooks/useTextDocState.js'

export function DocEditorPage() {
  const id = getUrlId()
  const state = useTextDocState(id)
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

  if (state.isLoading || !state.doc) {
    return <div className="DocEditorPage_loading">Loading...</div>
  }

  return (
    <>
      <button className="Board_menuButton" type="button" onClick={toggleSidebar}>
        Menu
      </button>

      <DocEditor
        doc={state.doc}
        editable={!state.isLocked}
        onTitleChange={state.onTitleChange}
        onContentChange={state.onContentChange}
      />

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
