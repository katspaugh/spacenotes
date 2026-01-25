# SpaceNotes

A real-time collaborative canvas for visual thinking. Create, connect, and organize your ideas with draggable cards.

<img width="1152" height="1097" alt="Image" src="https://github.com/user-attachments/assets/bf3bebfd-2358-4808-8b8c-f13dae7e129b" />

## User Guide

### Creating Cards

- **Double-click** anywhere on the canvas to create a new card
- New empty cards auto-focus so you can **start typing immediately**

### Editing Cards

- **Click** on a card to select it
- **Double-click** or just start typing to edit the text
- **Drag** cards to move them around the canvas
- Cards support **rich text** and **clickable links**

### Connecting Cards

- Click the **connector dot** (circle icon) on a card to start a connection
- Then click another card to **complete the connection**
- Or click empty space to **create a new connected card**
- **Click a line** to remove the connection

### Selection & Delete

- **Drag on canvas** to draw a selection box around multiple cards
- Move one selected card to **move all selected** cards together
- Press **Escape** or **Delete** key to delete selected cards

### Styling

- Use the **color picker** on cards to change their background color
- **Drag the corner** of a card to resize it (double-click corner to reset)
- Change the **canvas background** with the color picker at bottom-left

### Sharing & Collaboration

- Click the **Share button** (upload icon) to copy a link to this space
- Use **Invite** in the sidebar to create a collaboration link with edit access
- Invited collaborators see **live cursors** and changes in real-time
- Without an invite link, visitors can only **view** the space (locked mode)

### Authentication & Permissions

- **Sign in** to save spaces to your account
- Your spaces are listed in the sidebar
- Use **Fork** to copy someone else's space to your own account

#### Lock Mode

When viewing a space you don't own (and without an invite link):
- The space is in **read-only mode**
- A lock icon appears in the header
- Cards cannot be edited, moved, or resized
- You can **Fork** the space to make your own editable copy

#### Invite Links

Owners can generate invite links that grant edit access:
- Click **Invite** in the sidebar
- Share the generated link with collaborators
- Anyone with the link can edit in real-time
- Session tokens are stored per-space in the browser

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Escape** | Cancel connection / Delete selected cards |
| **Delete** | Delete selected cards (when not editing text) |

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Run linter
yarn lint
```

### Importing Spaces

A global `importSpace(json)` function is available to import space data:

```javascript
// In browser console - import any space JSON
importSpace('{"nodes":[{"id":"1","type":"text","x":100,"y":100,"content":"Hello"}],"edges":[]}')
```

The function accepts a JSON string with the space data and populates the current canvas with it.

## Supabase Configuration

1. Create environment variables `.env` with your project credentials:

   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. In Supabase, create a table **documents** with the following columns:
   - `id` (text, primary key)
   - `data` (text)
   - `user_id` (uuid, references `auth.users`)

3. Enable Row Level Security for the table and add a policy:
   `user_id = auth.uid()`.

4. Create a public storage bucket named **images**.

5. Deploy an Edge Function called **generate-link-preview** that accepts `{ url }` in the
   body and returns preview information.

Authentication with email/password is enabled via the Supabase dashboard. The
app wraps all React components in `SessionContextProvider` and uses the Supabase
client from `src/lib/supabase.ts`.
