# RFC Editor Redesign + Inline Comments (Phase 2) — Design

**Date:** 2026-06-30
**Status:** Approved (design); pending implementation plan
**Builds on:** Phase 1 (`docs/superpowers/specs/2026-06-29-text-documents-rfc-design.md`)

## Summary

Phase 2 turns the bare Phase 1 text-document editor into a polished **RFC editor**
that matches the provided redesign, and adds **inline comments** so teammates can
review RFCs and discuss specific passages. Two coupled deliverables:

1. **Visual redesign** of the document editor (`DocEditor` / `DocEditorPage`) to
   match the mockup — a "paper" document on a dotted cream background with real
   typography, a title/meta header, and a floating selection toolbar.
2. **Inline comments** — select text, leave a comment anchored to that range;
   highlights + numbered badges in the document; a right-hand Comments panel with
   Open/Resolved tabs, threaded replies, and resolve.

Design assets live in `docs/superpowers/design-assets/phase2/` (the RFC editor
HTML `rfc-editor.dc.html` and screenshots `rfc-left/right/check.png`).

### Non-goals (Phase 2)

- Human RFC IDs (e.g. "RFC-014"), space→document breadcrumb hierarchy, and the
  review-status workflow (the "IN REVIEW" badge) — deferred.
- The "Workbench" canvas/spaces redesign — separate future effort.
- Realtime comments; comment reactions, @mentions, notifications.
- Version-tagged comments (Phase 3 adds versions; `version_id` is omitted here).
- Yjs / collaborative editing (unchanged non-goal).

## Visual redesign

Match `docs/superpowers/design-assets/phase2/` using:

- **Fonts (Google Fonts):** `Hanken Grotesk` (400–800) for body/headings;
  `Space Mono` (400/700) for meta, badges, breadcrumb.
- **Tokens:** ink `#211b12`; indigo accent `#5b63d6`; cream page `#fbf8f0` with the
  existing dotted texture; white paper card (rounded corners, subtle border +
  shadow); muted meta `#8a8170`; comment highlight yellow `#fbe7a8`/`#e8ce7a`;
  sage `#9db58f` for resolved. Define as CSS variables; respect dark mode via the
  existing `prefers-color-scheme` pattern.
- **Layout:** centered readable column (~640–720px) inside the paper card. Header:
  small mono meta line, big bold title (driven by the document title), author +
  "edited <relative/abs date>" meta row, horizontal rule. Body: styled `h1–h3`,
  paragraphs with comfortable line-height, lists with em-dash markers, code blocks,
  blockquotes, links (indigo).
- **Floating selection toolbar:** appears on non-empty text selection near the
  selection — **B / i / U / Link / + Comment** (Comment is the indigo primary).
  The formatting buttons act on the editor; "+ Comment" starts a comment on the
  selected range. Only the owner sees formatting controls; any signed-in viewer
  sees "+ Comment".

Built with the `frontend-design` skill. The `DocEditor` extension list grows from
`[StarterKit]` to include `Underline`, `Link`, and the comment-decoration
extension (below).

## Comments data model

New Supabase table **`comments`**:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk default gen_random_uuid() | |
| `doc_id` | text | references the document id |
| `thread_id` | uuid | groups a thread; a root comment's `thread_id` = its own `id` |
| `parent_id` | uuid null | reply's parent (flat: replies point at the root) |
| `author_id` | uuid | `auth.uid()` of the commenter |
| `author_name` | text | denormalized display name (email local-part or profile name) |
| `body` | text | comment text |
| `anchor` | jsonb null | root comment: `{ from: int, to: int, quote: string }`; replies: null |
| `resolved` | boolean not null default false | thread-level; set on the root comment |
| `created_at` | timestamptz not null default now() | |

Threads are one level deep: a root comment (with `anchor`) plus flat `replies`
(`parent_id = root.id`, `anchor = null`). `resolved` is meaningful on the root.

### RLS (documents are publicly readable by anon — verified)

- **SELECT:** public (`true`) — anyone with the doc link can read comments.
- **INSERT:** authenticated and `author_id = auth.uid()`.
- **UPDATE/DELETE:** `author_id = auth.uid()`; additionally, updating `resolved`
  is allowed to the document owner (`exists (select 1 from documents d where
  d.id = comments.doc_id and d.user_id = auth.uid())`).

Applied via a Supabase CLI migration (same flow as Phase 1; controller applies it
with the env `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD`).

## Comments API

New `src/lib/comments-api.ts` (mirrors `dinky-api.ts` conventions, optional
injectable `client` for tests):

- `listComments(docId, client?): Promise<Comment[]>`
- `createComment(input, client?): Promise<Comment>` (root or reply)
- `updateComment(id, props, client?): Promise<void>` (body/resolved)
- `deleteComment(id, client?): Promise<void>`

A `Comment` type and a `CommentThread` view-model (`root` + `replies` + derived
`resolved`/`count`) live in `src/types/comment.d.ts`. A pure grouping helper
`groupIntoThreads(comments): CommentThread[]` is unit-tested.

## Comments UI

- **Highlight decoration layer:** a TipTap extension (`addProseMirrorPlugins`)
  builds a `DecorationSet` from the current threads' anchors — inline decoration
  (yellow highlight) over `[from,to]` plus a widget decoration (indigo numbered
  badge) at `to`. The document JSON is never mutated by commenting.
- **Position stability:** reviewers are read-only, so anchors are stable. While the
  owner edits, the plugin **maps decorations through each transaction** so
  highlights follow edits within the session. Anchors are re-derived on load (not
  continuously written back to the DB).
- **Outdated comments:** on load, each root re-anchors by locating its `quote` near
  `{from,to}`. If the surrounding text no longer matches, the comment is listed in
  the panel flagged **"content changed"** with no inline highlight (never
  mis-highlighted).
- **Comments panel** (right column): **Open / Resolved** tabs with counts. Each
  thread card: author avatar (color from name hash) + name + relative time + body,
  flat replies beneath, and a "Reply…" input. Clicking a highlight focuses its
  thread; clicking a thread scrolls/flashes its highlight. Resolve moves a thread
  to the Resolved tab (owner or thread author).
- **Connector line** (highlight → thread): nice-to-have, deferred if costly.
- **Empty/locked states:** anonymous viewers see comments read-only with a "sign
  in to comment" prompt (reuses the existing `LoginModal`).

## Sync

**Fetch on load + refetch on `window` focus**, and optimistic local update after
the current user posts/resolves/deletes. No realtime subscription.

## Components / files (anticipated)

- `src/lib/comments-api.ts`, `src/types/comment.d.ts`, `src/lib/comment-threads.ts`
  (grouping + re-anchor helpers, unit-tested).
- `src/hooks/useComments.ts` (load/refetch-on-focus, create/reply/resolve/delete,
  optimistic state).
- `src/components/doc/CommentExtension.ts` (TipTap decoration plugin).
- `src/components/doc/SelectionToolbar.tsx`, `CommentsPanel.tsx`,
  `CommentThread.tsx`.
- Restyle `src/components/doc/DocEditor.tsx`, `src/pages/DocEditorPage.tsx`, and
  CSS (new `src/styles` additions or a doc-scoped stylesheet); add Google Fonts.
- `supabase/migrations/<ts>_add_comments.sql`.

## Testing

- Vitest units: `comment-threads` grouping + quote re-anchor/outdated detection;
  `comments-api` with a mocked Supabase client; `useComments` (load, focus
  refetch, optimistic add/resolve); `SelectionToolbar`/`CommentsPanel` render +
  interaction; decoration builder maps a simple set correctly.
- Keep the full suite green; build green; no new lint errors.

## Suggested phasing (implementation plan)

1. **Visual redesign** of `DocEditor`/`DocEditorPage` (fonts, tokens, paper layout,
   typography, selection toolbar with formatting only) — shippable on its own.
2. **Comments backend** — `comments` table + RLS migration, `comments-api`, types,
   `comment-threads` helpers (unit-tested).
3. **Comments UI** — `useComments`, decoration layer, "+ Comment" flow, Comments
   panel with tabs/threads/replies/resolve, outdated handling, focus sync.
