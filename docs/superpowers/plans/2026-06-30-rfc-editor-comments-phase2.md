# RFC Editor Redesign + Inline Comments (Phase 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) tracking. This plan is executed by the **codex CLI as implementer** (per user instruction), driven task-by-task from the approved spec; each task ends green (build + tests) and is committed.

**Goal:** Restyle the text-document editor to match the RFC mockup and add inline comments (highlights + threaded Comments panel).

**Architecture:** Build on Phase 1's `DocEditor`/`DocEditorPage`/`useTextDocState`. Comments live in a new public-read Supabase `comments` table; highlights render as a ProseMirror decoration layer (never mutating the doc); a `useComments` hook loads/refetches-on-focus with optimistic updates. Three sub-phases: visual redesign → comments backend → comments UI.

**Tech Stack:** React 19, Vite, TypeScript, Supabase, TipTap v3.27.1 (StarterKit bundles Underline/Link; `BubbleMenu` for the selection toolbar; custom decoration extension), Vitest + @testing-library/react.

**Authoritative references:** spec `docs/superpowers/specs/2026-06-30-rfc-editor-comments-design.md`; design tokens/markup `docs/superpowers/design-assets/phase2/rfc-editor.dc.html` + screenshots. Implementers MUST read these for exact values.

## Global Constraints
- yarn 1.22.22; Vitest test runner (`yarn test <path>`); `yarn build` = `tsc -b && vite build`; `yarn lint`.
- Intra-project imports use `.js` extensions on `.ts`/`.tsx` files.
- TipTap 3.27.1; StarterKit already bundles Underline + Link (no new install). Decoration layer via `Extension.create({ addProseMirrorPlugins })` using `@tiptap/pm/state` + `@tiptap/pm/view`, mapping the DecorationSet through each transaction.
- Tests must be act-clean (use `findBy*`, `immediatelyRender:false`); full suite + build stay green; no new lint errors.
- Do NOT regress space/canvas behavior.
- `documents` are public-read (anon). `comments` RLS: SELECT public; INSERT authed & `author_id=auth.uid()`; UPDATE/DELETE author; resolve-update also allowed to doc owner.
- **Migrations are applied by the controller** — an implementer creates the `.sql` migration file only and must NOT run `supabase link`/`db push`.
- Comment bodies are user content → sanitize via `src/lib/sanitize-html.ts` on render.
- Design tokens (from the design HTML): fonts Hanken Grotesk (400–800) + Space Mono (400/700); ink `#211b12`; accent `#5b63d6`; page `#fbf8f0`; paper `#fff`; meta `#8a8170`; highlight `#fbe7a8`/`#e8ce7a`; resolved `#9db58f`. Dark mode via existing `prefers-color-scheme`.

---

## File Structure
- `index.html` (modify) — add Hanken Grotesk + Space Mono `<link>`.
- `src/styles.css` (modify) — design tokens as CSS variables + dark-mode; dotted page bg.
- `src/components/doc/doc-editor.css` (create) — paper layout, header, typography, toolbar, comments panel styles (or co-locate in styles.css per existing convention).
- `src/components/doc/DocEditor.tsx` (modify) — typography wrapper, enable Underline/Link, mount BubbleMenu toolbar + comment decoration extension.
- `src/components/doc/SelectionToolbar.tsx` (create) — BubbleMenu: B/i/U/Link + "+ Comment".
- `src/pages/DocEditorPage.tsx` (modify) — paper layout, breadcrumb/title/meta header, Comments panel column, wire useComments.
- `src/lib/comments-api.ts` (create) — list/create/update/delete (injectable client mirroring `dinky-api.ts`'s `DocumentsClient`/`FluentQuery`).
- `src/types/comment.d.ts` (create) — `Comment`, `CommentThread`, `CommentAnchor`.
- `src/lib/comment-threads.ts` (create) — `groupIntoThreads`, `reanchorThreads` (quote-based, outdated flag).
- `src/hooks/useComments.ts` (create) — load + window-focus refetch + optimistic create/reply/resolve/delete.
- `src/components/doc/CommentExtension.ts` (create) — decoration layer (highlight + numbered badge), maps through transactions.
- `src/components/doc/CommentsPanel.tsx`, `src/components/doc/CommentThread.tsx` (create) — Open/Resolved tabs, thread cards, replies, Reply box, resolve, outdated list, avatars (name-hash color).
- `supabase/migrations/<ts>_add_comments.sql` (create) — table + RLS + index.
- Tests co-located: `*.test.ts(x)` for comments-api, comment-threads, useComments, CommentExtension builder, SelectionToolbar, CommentsPanel, DocEditor.

---

## Tasks

### Task 1 — Fonts, design tokens & paper layout
**Files:** modify `index.html`, `src/styles.css`, `src/pages/DocEditorPage.tsx`; create doc editor CSS; Test: render test for the header meta (breadcrumb/title/edited).
**Produces:** CSS variables (`--ink`, `--accent`, `--page`, `--paper`, `--meta`, `--hl`, `--resolved`), `.DocPage`/`.DocPaper`/`.DocHeader` classes; DocEditorPage renders breadcrumb (`spaces / <title>`), big title (from `doc.title`), author + "edited <date>" meta row, `<hr>`.
**Acceptance:** match the design HTML's tokens/layout; `yarn build` green; render test asserts title + edited date render; manual: `yarn dev`, open a `?q=...&kind=doc` URL, confirm paper-on-dotted-cream layout. Commit.

### Task 2 — Editor typography + Underline/Link
**Files:** modify `src/components/doc/DocEditor.tsx`, `DocEditor.test.tsx`, doc CSS.
**Consumes:** Task 1 tokens/classes.
**Produces:** StarterKit configured with Underline + Link enabled; `.DocProse` typography (h1–h3, p, ul em-dash markers, code, blockquote, links in accent). Editable vs read-only preserved.
**Acceptance:** existing DocEditor tests still pass; new test: underline/link commands available when editable, read-only shows `contenteditable=false`; build green. Commit.

### Task 3 — Floating selection toolbar (BubbleMenu)
**Files:** create `src/components/doc/SelectionToolbar.tsx`; modify `DocEditor.tsx`; test `SelectionToolbar.test.tsx`.
**Consumes:** the editor instance.
**Produces:** `<SelectionToolbar editor canComment onComment />` rendering B/i/U/Link (formatting, owner only) + "+ Comment" (any signed-in viewer); appears on non-empty selection via `BubbleMenu` from `@tiptap/react/menus`. "+ Comment" calls `onComment(range)` (wired in Task 8; stub/no-op acceptable here).
**Acceptance:** interaction test toggles bold/underline via the toolbar on a selection; "+ Comment" invokes the callback; act-clean; build green. Commit.

### Task 4 — comments table migration + comments-api
**Files:** create `supabase/migrations/<ts>_add_comments.sql` (do NOT apply — controller does), `src/lib/comments-api.ts`, `src/lib/comments-api.test.ts`.
**Produces:**
`listComments(docId: string, client?): Promise<Comment[]>`,
`createComment(input: NewComment, client?): Promise<Comment>`,
`updateComment(id: string, props: Partial<Pick<Comment,'body'|'resolved'>>, client?): Promise<void>`,
`deleteComment(id: string, client?): Promise<void>`.
SQL: `create table comments (...)` with the spec's columns, `gen_random_uuid()` default, `enable row level security`, the 4 policies, and `create index on comments(doc_id)`.
**Acceptance:** mocked-client unit tests (mirror `dinky-api.test.ts`'s fake) verify select-by-doc, insert payload (author_id, anchor, thread_id), update resolved, delete; build green. Commit (include the migration file). Controller then applies the migration.

### Task 5 — comment types + thread helpers
**Files:** create `src/types/comment.d.ts`, `src/lib/comment-threads.ts`, `src/lib/comment-threads.test.ts`.
**Produces:** types `Comment`, `CommentAnchor = {from:number;to:number;quote:string}`, `CommentThread = { root: Comment; replies: Comment[]; resolved: boolean; outdated: boolean }`; `groupIntoThreads(comments: Comment[]): CommentThread[]`; `reanchorThreads(threads, docText: string): CommentThread[]` (locates `quote` near `[from,to]`; sets `outdated=true` if not found).
**Acceptance:** unit tests for grouping (root+replies, resolved from root), and re-anchor (match → not outdated; changed text → outdated). Pure functions, no React. Commit.

### Task 6 — useComments hook
**Files:** create `src/hooks/useComments.ts`, `src/hooks/useComments.test.tsx`.
**Consumes:** comments-api, comment-threads, `useSession`.
**Produces:** `useComments(docId, docOwnerId?) → { threads, openThreads, resolvedThreads, loading, error, addComment(anchor,body), reply(threadId,body), resolve(threadId,resolved), remove(id), canResolve(thread) }`. Loads on mount; refetches on `window` focus; optimistic update for the current user's own actions.
**Acceptance:** tests with mocked comments-api + useSession: loads & groups; refetches on `window` `focus` event; optimistic add appears immediately; resolve flips thread; act-clean. Commit.

### Task 7 — comment decoration extension
**Files:** create `src/components/doc/CommentExtension.ts`, `CommentExtension.test.ts`.
**Produces:** `CommentDecorations` TipTap extension + a pure `buildDecorations(doc, threads): DecorationSet` builder: inline highlight over `[from,to]` (class `.cmt-highlight`, resolved variant) + a widget badge (number) at `to`; plugin maps decorations through `tr` and exposes a way to set threads (via extension storage/`setMeta`).
**Acceptance:** unit test on `buildDecorations` against a small ProseMirror doc returns decorations at expected positions; resolved thread gets resolved class; build green. Commit.

### Task 8 — wire comments end-to-end (panel + create flow)
**Files:** create `src/components/doc/CommentsPanel.tsx`, `CommentThread.tsx` + tests; modify `src/pages/DocEditorPage.tsx`, `src/components/doc/DocEditor.tsx`, `SelectionToolbar.tsx`.
**Consumes:** useComments, CommentExtension, SelectionToolbar.
**Produces:** Comments panel column (Open/Resolved tabs + counts), thread cards (avatar name-hash color, name, relative time, sanitized body, flat replies, Reply box), resolve button (gated by `canResolve`), outdated threads listed flagged "content changed" with no highlight; "+ Comment" creates a comment on the current selection (`{from,to,quote}`); clicking a highlight focuses its thread and vice-versa; anonymous users see read-only + "sign in to comment" (reuse `LoginModal`). Feed threads into the decoration extension.
**Acceptance:** render/interaction tests: posting a comment calls addComment with the selection anchor; Open/Resolved tabs filter; reply adds under root; resolve moves to Resolved; outdated thread shows flag, no highlight; anonymous shows sign-in prompt; act-clean; full `yarn test` + `yarn build` green; `yarn lint` no new errors. Commit.

---

## Out of scope (deferred)
Human RFC IDs, space→doc breadcrumb hierarchy, IN-REVIEW status workflow, realtime comments, reactions/@mentions/notifications, version-tagged comments (Phase 3), connector line highlight→thread, the Workbench/canvas redesign.

## Manual verification checklist
- `yarn dev`; open a doc URL (`?q=<id>&kind=doc`): paper-on-dotted-cream, Hanken Grotesk body, Space Mono meta, breadcrumb/title/edited header, styled headings/lists/code.
- Select text → floating toolbar appears; bold/underline/link work (as owner).
- "+ Comment" on a selection → highlight + badge appear; thread shows in Open with your avatar.
- Reply, then resolve → thread moves to Resolved; highlight reflects resolved state.
- Edit the doc so a commented phrase changes → on reload, that thread shows "content changed", no highlight.
- Open in a logged-out browser → comments visible read-only, "sign in to comment" prompt.
- Existing canvas spaces unchanged.
