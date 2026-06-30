# Text Documents (RFCs) with Inline Comments — Design

**Date:** 2026-06-29
**Status:** Approved (design); pending implementation plan

## Summary

Extend SpaceNotes beyond canvas "spaces" to support long-form **text documents**
for sharing technical RFCs. Documents are authored in a block-level,
Markdown-enabled editor (TipTap), shared via link, and reviewed by teammates who
leave **inline comments** anchored to text ranges. Editing is **single-user and
versioned** — no collaborative/realtime editing.

### Non-goals (YAGNI)

- No realtime or collaborative editing; no Yjs/CRDT.
- No Markdown file import/export (editing shortcuts only).
- No notifications/email.
- No per-link capability tokens for docs (signed-in identity is the access model).
- No automatic cross-version comment migration beyond quote-based re-anchoring.

## Key decisions

| Decision | Choice |
| --- | --- |
| Doc/space relationship | New **top-level doc type** via a `kind` field (`'space'` \| `'doc'`) |
| Editor library | **TipTap** + StarterKit (block-level Markdown input rules) |
| Comments storage | **Separate `comments` table**, never mutating the document |
| Comment anchoring | **Text-range highlight** rendered as ProseMirror decorations |
| Versioning | **Explicit named versions** (immutable snapshots) + autosaved live draft |
| Who can comment | **Signed-in users only**; anonymous can read |

## Data model & storage

### `documents` table

Add a column **`kind` text not null default `'space'`**. This lets us list and
filter documents without parsing the JSON blob. Text documents reuse the existing
`data` (text/JSON) column.

```ts
// src/types — text document blob shape (stored in documents.data)
type TextDocData = {
  id: string
  schemaVersion: 2
  kind: 'doc'
  title?: string
  userId?: string
  content: TipTapJSON   // current live draft (ProseMirror/TipTap JSON)
}
```

Existing `DinkyDataV2` (spaces) is unchanged. `kind` is stored both in the column
(for listing) and implicitly in the blob shape.

### `doc_versions` table (new)

Immutable named snapshots of a document.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `doc_id` | text | references `documents.id` |
| `name` | text | user-supplied version label |
| `content` | text | TipTap JSON snapshot at publish time |
| `created_by` | uuid | author of the snapshot |
| `created_at` | timestamptz default now() | |

### `comments` table (new)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `doc_id` | text | references `documents.id` |
| `version_id` | uuid null | version the comment was made against (null = live draft) |
| `thread_id` | uuid | groups a thread; root comment's `thread_id` = its own `id` |
| `parent_id` | uuid null | reply parent within a thread |
| `author_id` | uuid | `auth.uid()` of commenter |
| `author_name` | text | denormalized display name |
| `body` | text | comment text |
| `anchor` | jsonb | `{ from: number, to: number, quote: string }` |
| `resolved` | boolean default false | |
| `created_at` | timestamptz default now() | |

`anchor.quote` is the selected text captured at comment time; used to re-anchor or
detect orphans on load without Yjs relative positions.

## Routing & components

- `loadDoc(id)` returns `kind` (read from the `kind` column).
- App branches on `kind`: existing `Board` / `EditorPage` for spaces; a new
  **`DocEditorPage`** for text documents.
- "New" action presents a small menu: **Space** or **Document**.
- The spaces/documents list shows both kinds with a type icon.
- New doc-side code lives under `src/components/doc/` and new hooks under
  `src/hooks/`, mirroring existing conventions (notably `.js` import extensions on
  `.ts`/`.tsx` files per Vite ESM requirement).

## Editor

- TipTap with StarterKit: Markdown input rules (`## ` → heading, `- ` → bullet,
  ```` ``` ```` → code block, `**bold**`, etc.), headings, lists, blockquote, code.
- **Owner editing only.** Reuses the existing autosave pattern: debounced save plus
  `beforeunload` beacon (see `useInitApp` / `useBeforeUnload`).
- Read/comment users get a non-editable editor instance.

## Comments

Because RLS prevents non-owners from writing the document row, **comments never
mutate the document**:

- Highlights are ProseMirror **decorations** computed from the `comments` table —
  an overlay, not stored marks in the doc JSON.
- Selecting text surfaces a "Comment" affordance → creates a thread row with
  `anchor = { from, to, quote }`.
- Clicking a highlight opens its thread (replies, resolve) in a right-hand comment
  sidebar.
- On load, each comment re-anchors by verifying `quote` at/near `from..to`. If the
  surrounding text changed, the comment is flagged **outdated** and listed
  separately rather than highlighting the wrong span.

## Versioning

- Live draft autosaves to `documents.data`.
- **"Save version"** writes an immutable row to `doc_versions` with a name.
- A version dropdown lets the user view past snapshots read-only, with the comments
  made against them.
- New comments are tagged with the `version_id` they were authored against (null
  for the live draft).

## Permissions / RLS

Roles:

- **Owner** — edit document, create versions, resolve any comment.
- **Signed-in non-owner** — read + comment/reply + resolve own comments.
- **Anonymous** — read-only; prompted to sign in to comment.

RLS policies:

- `documents` — unchanged update policy (`user_id = auth.uid()`); read remains as
  today (link-based read).
- `doc_versions` — `select` allowed to anyone who can read the parent doc; `insert`
  restricted to the doc owner.
- `comments` — `select` allowed to anyone who can read the parent doc; `insert`
  allowed to any authenticated user; `update`/`delete` restricted to the comment
  author, with resolve also permitted to the doc owner.

## Suggested implementation phasing

Each phase is independently shippable:

1. **Doc type + editor** — `kind` column, `TextDocData`, `DocEditorPage` with
   TipTap, create/list/open flows, owner autosave.
2. **Comments** — `comments` table + RLS, decoration overlay, selection affordance,
   thread sidebar, quote re-anchoring/orphan handling.
3. **Versions** — `doc_versions` table + RLS, "Save version", version viewer,
   version-tagged comments.
