import { Board } from './board/Board.js'
import { Sidebar } from './Sidebar.js'
import { uploadImage } from '../lib/upload-image.js'
import { ImageDrop } from './ImageDrop.js'
import { useDocument } from '../context/DocumentContext.js'

export function Editor() {
  const state = useDocument()
  const { doc, cursors, clientId, onCursorMove, onNodeCreate, onNodeDelete, onNodeUpdate, onConnect, onDisconnect, onBackgroundColorChange, onTitleChange, onFork, isLocked, onShareSession, isOwner } = state

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
      />

      <Sidebar
        onFork={onFork}
        onTitleChange={onTitleChange}
        isLocked={isLocked}
        title={doc.title}
        onShareSession={onShareSession}
        isOwner={isOwner}
      />
    </ImageDrop>
  )
}
