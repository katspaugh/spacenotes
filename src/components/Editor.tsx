import { useState, useCallback } from 'react'
import { Board } from './board/Board.js'
import { Sidebar } from './Sidebar.js'
import { LoginModal } from './LoginModal.js'
import { uploadImage } from '../lib/upload-image.js'
import { ImageDrop } from './ImageDrop.js'
import { useDocument } from '../context/DocumentContext.js'

export function Editor() {
  const state = useDocument()
  const { doc, cursors, clientId, onCursorMove, onNodeCreate, onNodeDelete, onNodeUpdate, onConnect, onDisconnect, onBackgroundColorChange, onTitleChange, onFork, isLocked, onShareSession, isOwner, onPostLoginSave } = state

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(open => !open)
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
    onPostLoginSave?.()
  }, [onPostLoginSave])

  return (
    <ImageDrop
      onNodeCreate={onNodeCreate}
      onNodeDelete={onNodeDelete}
      onNodeUpdate={onNodeUpdate}
      uploadImage={uploadImage}
    >
      <Board
        {...doc}
        onNodeCreate={onNodeCreate}
        onNodeDelete={onNodeDelete}
        onNodeUpdate={onNodeUpdate}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onBackgroundColorChange={onBackgroundColorChange}
        cursors={cursors}
        clientId={clientId}
        onCursorMove={onCursorMove}
        selections={state.selections}
        onSelectNodes={state.onSelectNodes}
        title={doc.title}
        onTitleChange={onTitleChange}
        onToggleSidebar={toggleSidebar}
        onShareSession={onShareSession}
        isOwner={isOwner}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onFork={onFork}
        isLocked={isLocked}
        onShareSession={onShareSession}
        isOwner={isOwner}
        onSignIn={openLoginModal}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </ImageDrop>
  )
}
