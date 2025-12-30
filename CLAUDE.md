# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SpaceNotes** is a real-time collaborative diagramming tool built with React and Supabase. Users create "spaces" containing draggable cards (nodes) connected by edges. Multiple participants can collaborate in real-time with visible cursors in random bright colors.

## Development Commands

```bash
# Start development server on port 8080
yarn dev

# Type-check and build for production
yarn build

# Lint the codebase
yarn lint

# Preview production build
yarn preview
```

## Architecture

### Data Flow & State Management

The application uses a multi-layered state architecture:

1. **DocumentContext** (`src/context/DocumentContext.tsx`) - Central context combining:
   - `useDocState` - Local document state (nodes, edges, colors)
   - `useRealtimeDocState` - Realtime collaboration layer wrapping local state
   - `useInitApp` - App initialization and persistence logic

2. **Realtime Collaboration** (`src/hooks/useRealtimeDocState.ts`):
   - Wraps `useDocState` to add realtime broadcast/receive
   - Uses Supabase Realtime channels for peer-to-peer communication
   - Two channel types:
     - Broadcast channel (`space:${doc.id}:${sessionToken}`) for realtime actions
     - Postgres changes channel for document updates from database
   - Debounced sends for cursor moves (20ms), node updates (50ms), selections (20ms)
   - `pendingUpdates` ref handles race conditions when updates arrive before node creation

3. **Session & Permissions**:
   - Document has `userId` (owner)
   - Each collaborator gets a `sessionToken` for edit access
   - `isLocked` = can't edit (not owner and no session token)
   - `canSendRef` controls whether client can broadcast changes

### Component Structure

- **Pages** (`src/pages/`):
  - `AuthPage` - Login/signup via Supabase
  - `SpacesPage` - List user's documents
  - `EditorPage` - Main canvas editor

- **Board** (`src/components/board/`):
  - `Board.tsx` - Canvas container, handles selections, connections, cursors
  - `DraggableNode.tsx` - Individual card with drag/resize
  - `Edge.tsx` - SVG connectors between nodes with adaptive curves
  - `Editable.tsx` - Contenteditable text with sanitization
  - `SelectionBox.tsx` - Drag-to-select box
  - `Connector.tsx` - Connection point UI for linking cards

### Realtime Protocol

Actions broadcast via `useRealtimeChannel` (`src/hooks/useRealtimeChannel.ts`):

```typescript
type RealtimeAction =
  | { type: 'node:create'; node: CanvasNode }
  | { type: 'node:update'; id: string; props: Partial<CanvasNode> }
  | { type: 'node:delete'; id: string }
  | { type: 'edge:create'; edge: CanvasEdge }
  | { type: 'edge:delete'; from: string; to: string }
  | { type: 'space:background'; color: string }
  | { type: 'space:title'; title: string }
  | { type: 'cursor:move'; x: number; y: number; color: string }
  | { type: 'node:select'; ids: string[]; color: string }
```

Each action includes `clientId` to filter out self-broadcasts (configured with `broadcast: { self: false }`).

### Data Persistence

- **API** (`src/lib/dinky-api.ts`):
  - `loadDoc(id)` - Fetch document from Supabase
  - `saveDoc(data, userId)` - Upsert document
  - `saveDocBeacon(data, accessToken, userId)` - Beacon API for unload saves
  - `listDocsPage(userId, page, perPage)` - Paginated document list

- **Autosave** (`src/hooks/useInitApp.ts`):
  - Saves on `beforeunload` event via `useBeforeUnload` hook
  - Uses Beacon API for reliable saves during page unload
  - Fork prompt if non-owner makes changes without session token

### Supabase Configuration

Required environment variables in `.env`:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Database schema:
- Table: `documents`
  - `id` (text, primary key)
  - `data` (text, JSON blob)
  - `user_id` (uuid, references auth.users)
  - Row Level Security: `user_id = auth.uid()`

Storage:
- Bucket: `images` (public)
- Used by `src/lib/upload-image.ts` for drag-and-drop images

Edge Functions:
- `generate-link-preview` - Accepts `{ url }`, returns preview metadata

### Key Interactions

**Creating Connections**:
1. Click connector on source node → stores `tempFrom` in Board
2. Click target node → calls `onConnect(from, to, color)`
3. Click empty space → creates new node and connects

**Multi-select**:
- Drag selection box or single-click nodes
- Moving one node in selection moves all with same delta
- ESC or Delete key to delete selected nodes

**Cursors & Selections**:
- Each client has unique `clientId` stored in sessionStorage
- Cursor position and selected nodes broadcast to peers
- Remote selections shown as colored borders on nodes

### Utility Libraries

- `src/lib/utils.ts` - `randomId()`, `debounce()`, color generators
- `src/lib/sanitize-html.ts` - DOMPurify wrapper for user content
- `src/lib/draggable.ts` - Generic drag handler utilities
- `src/lib/url.ts` - URL manipulation for document ID routing

### Data Format

Document structure based on JSON Canvas spec (https://jsoncanvas.org/spec/1.0/):

```typescript
type DinkyDataV2 = {
  id: string
  version: 2
  title?: string
  backgroundColor?: string
  userId?: string
  lastSequence: number  // Unused, legacy field
  nodes: CanvasNode[]   // Cards with position, content, color
  edges: CanvasEdge[]   // Connections between nodes
}
```

## Important Notes

- All hooks use `.js` extensions in imports despite being `.ts` files (Vite ESM requirement)
- The project directory is still named `dinky.dog` but the application is called SpaceNotes
- Dark mode is detected via `prefers-color-scheme` media query in CSS
- Package manager is Yarn 1.22.22 (see `packageManager` in package.json)
