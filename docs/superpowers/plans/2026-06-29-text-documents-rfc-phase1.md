# Text Documents (RFCs) — Phase 1: Doc Type + TipTap Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class text documents alongside existing canvas spaces, with TipTap editing, document creation/list/open flows, owner autosave, and type-aware persistence.

**Architecture:** The `documents.kind` column becomes the routing discriminator for existing spaces versus new text documents. Existing canvas state remains owned by `DocumentProvider`/`Editor`; text documents get a separate `DocEditorPage`, `DocEditor`, and text-doc hook so Phase 1 does not disturb board behavior. Shared Supabase API functions read and write `kind`, and the sidebar surfaces mixed document metadata.

**Tech Stack:** React 19, Vite, TypeScript, Supabase, TipTap v3.27.1, Vitest + Testing Library, Playwright e2e smoke tests.

## Global Constraints

Package manager is **yarn 1.22.22**; install packages with `yarn add` / `yarn add -D`.
All intra-project imports use **`.js` extensions even though source files are `.ts`/`.tsx`**.
TipTap packages are **v3.27.1**: `@tiptap/react@^3.27.1`, `@tiptap/pm@^3.27.1`, `@tiptap/starter-kit@^3.27.1`.
React is 19; use React 19-compatible Testing Library and TipTap config.
Vitest is the Phase 1 unit/integration test runner; keep existing `test:e2e` unchanged.
Do not regress or refactor unrelated space/canvas behavior.
Supabase RLS on `documents` is `user_id = auth.uid()`; `documents.data` stores a JSON string blob plus `id` and `user_id`.
Phases 2 comments and 3 versions are out of scope.

---

## File Structure

Create `vitest.config.ts` — Vitest config using jsdom, globals, and React plugin.
Create `src/test/setup.ts` — Testing Library jest-dom setup.
Create `src/lib/vitest-sanity.test.ts` — initial sanity test proving Vitest runs.
Modify `package.json:1-31` — add TipTap dependencies, Vitest/testing dev dependencies, and `"test": "vitest run"`.
Create `supabase/migrations/20260629000000_add_documents_kind.sql` — migration adding `documents.kind`.
Modify `src/lib/dinky-api.ts:1-118` — add `kind` support to `loadDoc`, `saveDoc`, `saveDocBeacon`, and `listDocsPage`.
Create `src/lib/dinky-api.test.ts` — mocked Supabase tests for kind read/write/list mapping.
Create `src/types/doc.d.ts` — structural TipTap JSON and `TextDocData` types.
Create `src/lib/doc-kind.ts` — document kind helpers and `createTextDoc`.
Create `src/lib/doc-kind.test.ts` — TDD coverage for text-doc defaults and kind guards.
Create `src/components/doc/DocEditor.tsx` — TipTap StarterKit editor component with editable/read-only mode.
Create `src/components/doc/DocEditor.test.tsx` — render tests for editable/read-only wiring.
Create `src/hooks/useTextDocState.ts` — text document loading, title/content mutation, owner autosave, and beforeunload beacon.
Create `src/pages/DocEditorPage.tsx` — page shell for text documents, login modal, sidebar, and doc editor.
Modify `src/lib/url.ts:1-38` — add URL kind support for new-document routing.
Create `src/lib/url.test.ts` — URL helper tests for preserving `kind=doc`.
Modify `src/pages/EditorPage.tsx:1-10` — route to space editor or doc editor based on loaded/new kind.
Modify `src/hooks/useInitApp.ts:1-218` — treat loaded docs as spaces only and preserve existing board flow.
Modify `src/components/App.tsx:1-18` — preserve auto-create space behavior and keep routing delegated to `EditorPage`.
Modify `src/components/Sidebar.tsx:1-239` — replace `+ New space` with Space/Document affordance and show kind-specific list icons.
Create `src/components/Sidebar.test.tsx` — render tests for new menu links and mixed-kind list items.

---

## Tasks

### Task 1: Add Vitest, TipTap dependencies, and a sanity test

**Files:** Create `vitest.config.ts`, `src/test/setup.ts`, `src/lib/vitest-sanity.test.ts`; Modify `package.json:1-31`; Test `src/lib/vitest-sanity.test.ts`

**Interfaces:**  
Consumes: none.  
Produces: `yarn test`, Vitest globals, jsdom test environment.

- [ ] Install dependencies.

```bash
yarn add @tiptap/react@^3.27.1 @tiptap/pm@^3.27.1 @tiptap/starter-kit@^3.27.1
yarn add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] Replace `package.json` with:

```json
{
  "name": "spacenotes",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 8080",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@supabase/auth-helpers-react": "^0.5.0",
    "@supabase/supabase-js": "^2.50.2",
    "@tiptap/pm": "^3.27.1",
    "@tiptap/react": "^3.27.1",
    "@tiptap/starter-kit": "^3.27.1",
    "dompurify": "^3.2.6",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.30.0",
    "@playwright/test": "^1.58.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.6.0",
    "eslint": "^9.30.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.2.0",
    "jsdom": "^26.1.0",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.35.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.4"
  },
  "packageManager": "yarn@1.22.22+sha512.a6b2f7906b721bba3d67d4aff083df04dad64c399707841b7acf00f6b133b7ac24255f2652fa22ae3534329dc6180534e98d17432037ff6fd140556e2bb3137e"
}
```

- [ ] Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] Create failing sanity test `src/lib/vitest-sanity.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('vitest setup', () => {
  it('runs TypeScript tests in jsdom', () => {
    expect(window.location.href).toBe('http://localhost:3000/')
  })
})
```

- [ ] Run the test and expect FAIL because jsdom default URL is not `http://localhost:3000/`.

```bash
yarn test src/lib/vitest-sanity.test.ts
```

- [ ] Replace `src/lib/vitest-sanity.test.ts` with the passing version:

```ts
import { describe, expect, it } from 'vitest'

describe('vitest setup', () => {
  it('runs TypeScript tests in jsdom', () => {
    expect(window.document).toBeDefined()
  })
})
```

- [ ] Run and expect PASS.

```bash
yarn test src/lib/vitest-sanity.test.ts
```

- [ ] Commit.

```bash
git add package.json yarn.lock vitest.config.ts src/test/setup.ts src/lib/vitest-sanity.test.ts
git commit -m "Add Vitest and TipTap dependencies

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 2: Add `documents.kind` and persist kind in the data API

**Files:** Create `supabase/migrations/20260629000000_add_documents_kind.sql`; Modify `src/lib/dinky-api.ts:1-118`; Test `src/lib/dinky-api.test.ts`

**Interfaces:**  
Consumes: existing `DinkyDataV2`, existing Supabase `documents` table.  
Produces:
`export type DocumentKind = 'space' | 'doc'`  
`export type SpaceMeta = { id: string; title?: string; backgroundColor?: string; updated_at?: string; kind: DocumentKind }`  
`loadDoc(id: string, client?: DocumentsClient): Promise<DinkyDataV2>`  
`saveDoc(data: DinkyDataV2, userId: string, client?: DocumentsClient): Promise<{ status: number; key: string }>`  
`saveDocBeacon(data: DinkyDataV2, accessToken: string, userId: string): void`  
`listDocsPage(userId: string, page?: number, perPage?: number, client?: DocumentsClient): Promise<{ spaces: SpaceMeta[]; total: number }>`

- [ ] Link Supabase project.

```bash
supabase link --project-ref qziwwdwekibzhtgefeef
```

- [ ] Create a migration.

```bash
supabase migration new add_documents_kind
```

- [ ] If Supabase creates a timestamped filename, rename it to `supabase/migrations/20260629000000_add_documents_kind.sql` for this plan, then write exactly:

```sql
alter table documents add column if not exists kind text not null default 'space';
```

- [ ] Push the migration.

```bash
supabase db push
```

- [ ] Create failing mocked Supabase tests in `src/lib/dinky-api.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listDocsPage, loadDoc, saveDoc, saveDocBeacon, type DinkyDataV2 } from './dinky-api.js'

type QueryResult = {
  data?: unknown
  count?: number | null
  error?: { message?: string; code?: string } | null
}

class QueryBuilder {
  selected = ''
  upsertPayload: unknown
  constructor(private result: QueryResult) {}

  select(columns: string) {
    this.selected = columns
    return this
  }

  eq() {
    return this
  }

  order() {
    return this
  }

  range() {
    return Promise.resolve(this.result)
  }

  maybeSingle() {
    return Promise.resolve({
      data: this.result.data,
      error: this.result.error ?? null,
    })
  }

  upsert(payload: unknown) {
    this.upsertPayload = payload
    return Promise.resolve({ error: this.result.error ?? null })
  }
}

class FakeSupabase {
  builder: QueryBuilder
  table = ''

  constructor(result: QueryResult) {
    this.builder = new QueryBuilder(result)
  }

  from(table: string) {
    this.table = table
    return this.builder
  }
}

const spaceDoc: DinkyDataV2 = {
  id: 'space-1',
  kind: 'space',
  version: 2,
  lastSequence: 0,
  nodes: [],
  edges: [],
  title: 'Space One',
}

describe('dinky-api kind mapping', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loadDoc selects and returns kind from the row', async () => {
    const client = new FakeSupabase({
      data: {
        data: JSON.stringify(spaceDoc),
        user_id: 'user-1',
        kind: 'space',
      },
    })

    await expect(loadDoc('space-1', client)).resolves.toEqual({
      ...spaceDoc,
      userId: 'user-1',
      kind: 'space',
    })
    expect(client.table).toBe('documents')
    expect(client.builder.selected).toBe('data, user_id, kind')
  })

  it('loadDoc defaults old rows without kind to space', async () => {
    const client = new FakeSupabase({
      data: {
        data: JSON.stringify({ ...spaceDoc, kind: undefined }),
        user_id: 'user-1',
      },
    })

    await expect(loadDoc('space-1', client)).resolves.toMatchObject({
      id: 'space-1',
      kind: 'space',
    })
  })

  it('saveDoc upserts kind next to the JSON blob', async () => {
    const client = new FakeSupabase({})

    await expect(saveDoc(spaceDoc, 'user-1', client)).resolves.toEqual({
      status: 200,
      key: 'space-1',
    })

    expect(client.builder.upsertPayload).toEqual({
      id: 'space-1',
      data: JSON.stringify(spaceDoc),
      user_id: 'user-1',
      kind: 'space',
    })
  })

  it('listDocsPage surfaces kind for sidebar metadata', async () => {
    const client = new FakeSupabase({
      data: [
        {
          id: 'doc-1',
          data: JSON.stringify({ title: 'RFC' }),
          kind: 'doc',
          updated_at: '2026-06-29T12:00:00Z',
        },
        {
          id: 'space-1',
          data: JSON.stringify({ nodes: [{ content: '<b>Fallback</b>' }], backgroundColor: '#fff' }),
          kind: 'space',
        },
      ],
      count: 2,
    })

    await expect(listDocsPage('user-1', 1, 12, client)).resolves.toEqual({
      total: 2,
      spaces: [
        {
          id: 'doc-1',
          title: 'RFC',
          kind: 'doc',
          backgroundColor: undefined,
          updated_at: '2026-06-29T12:00:00Z',
        },
        {
          id: 'space-1',
          title: 'Fallback',
          kind: 'space',
          backgroundColor: '#fff',
          updated_at: undefined,
        },
      ],
    })

    expect(client.builder.selected).toBe('id, data, updated_at, kind')
  })

  it('saveDocBeacon posts kind with keepalive', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

    saveDocBeacon(spaceDoc, 'token-1', 'user-1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/documents?on_conflict=id'),
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({
          id: 'space-1',
          data: JSON.stringify(spaceDoc),
          user_id: 'user-1',
          kind: 'space',
        }),
      }),
    )
  })
})
```

- [ ] Run and expect FAIL because `kind` is not selected, returned, or persisted.

```bash
yarn test src/lib/dinky-api.test.ts
```

- [ ] Replace `src/lib/dinky-api.ts` with:

```ts
import type { CanvasProps } from '../types/canvas.js'
import { stripHtml } from './sanitize-html.js'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js'

export type DocumentKind = 'space' | 'doc'

export type DinkyDataV2 = CanvasProps & {
  id: string
  kind: 'space'
  lastSequence: number
  title?: string
  backgroundColor?: string
  version: 2
  userId?: string
}

export type DocumentsClient = {
  from: (table: 'documents') => {
    select: (columns: string, options?: { count?: 'exact' }) => unknown
    upsert?: (payload: unknown) => Promise<{ error: unknown }>
    delete?: () => unknown
  }
}

type DocumentRow = {
  id?: string
  data: string
  user_id?: string
  kind?: DocumentKind | null
  updated_at?: string
}

export type SpaceMeta = {
  id: string
  title?: string
  backgroundColor?: string
  updated_at?: string
  kind: DocumentKind
}

function getRowKind(row: Pick<DocumentRow, 'kind'>): DocumentKind {
  return row.kind === 'doc' ? 'doc' : 'space'
}

export async function loadDoc(id: string, client = supabase): Promise<DinkyDataV2> {
  const { data: row, error } = await client
    .from('documents')
    .select('data, user_id, kind')
    .eq('id', id)
    .maybeSingle()

  if (error || !row) {
    throw new Error(error?.message || 'Document not found')
  }

  const typedRow = row as DocumentRow
  const data = JSON.parse(typedRow.data)

  return { ...data, userId: typedRow.user_id, kind: getRowKind(typedRow) }
}

export async function saveDoc(data: DinkyDataV2, userId: string, client = supabase): Promise<{ status: number; key: string }> {
  const kind = data.kind ?? 'space'
  const encData = JSON.stringify({ ...data, kind })
  const { error } = await client
    .from('documents')
    .upsert({ id: data.id, data: encData, user_id: userId, kind })

  if (error) {
    throw error
  }
  return { status: 200, key: data.id }
}

export function saveDocBeacon(data: DinkyDataV2, accessToken: string, userId: string): void {
  const url = `${SUPABASE_URL}/rest/v1/documents?on_conflict=id`
  const kind = data.kind ?? 'space'
  const encData = JSON.stringify({ ...data, kind })
  const body = JSON.stringify({ id: data.id, data: encData, user_id: userId, kind })
  void fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body,
    keepalive: true,
  })
}

export async function listDocsPage(userId: string, page = 1, perPage = 12, client = supabase): Promise<{ spaces: SpaceMeta[]; total: number }> {
  if (!userId) {
    return { spaces: [], total: 0 }
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const makeQueryWithTimestamp = () =>
    client
      .from('documents')
      .select('id, data, updated_at, kind', { count: 'exact' })
      .eq('user_id', userId)

  const makeQueryWithoutTimestamp = () =>
    client
      .from('documents')
      .select('id, data, kind', { count: 'exact' })
      .eq('user_id', userId)

  let { data, count, error } = await makeQueryWithTimestamp()
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (error?.code === '42703') {
    const fallback = await makeQueryWithoutTimestamp().range(from, to)
    data = fallback.data as typeof data
    count = fallback.count
    error = fallback.error
  }

  if (error || !data) {
    throw error || new Error('Unable to load documents')
  }

  const spaces = data.map((row: DocumentRow) => {
    try {
      const parsed = JSON.parse(row.data)
      return {
        id: row.id || '',
        title: parsed.title || stripHtml(parsed.nodes?.[0]?.content || ''),
        backgroundColor: parsed.backgroundColor,
        updated_at: row.updated_at,
        kind: getRowKind(row),
      } as SpaceMeta
    } catch {
      return { id: row.id || '', updated_at: row.updated_at, kind: getRowKind(row) } as SpaceMeta
    }
  })
  return { spaces, total: count || spaces.length }
}

export async function deleteDoc(id: string) {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) {
    throw error
  }
}
```

- [ ] Run and expect PASS.

```bash
yarn test src/lib/dinky-api.test.ts
```

- [ ] Commit.

```bash
git add supabase src/lib/dinky-api.ts src/lib/dinky-api.test.ts
git commit -m "Persist document kind in Supabase API

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 3: Add text document types and kind helpers

**Files:** Create `src/types/doc.d.ts`, `src/lib/doc-kind.ts`; Test `src/lib/doc-kind.test.ts`

**Interfaces:**  
Consumes: `DocumentKind` from `src/lib/dinky-api.js`.  
Produces:
`export type TipTapJSON`  
`export type TextDocData`  
`isTextDoc(value: unknown): value is TextDocData`  
`isSpaceDoc(value: unknown): value is DinkyDataV2`  
`createTextDoc(id: string, userId?: string): TextDocData`

- [ ] Create failing tests in `src/lib/doc-kind.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createTextDoc, isSpaceDoc, isTextDoc } from './doc-kind.js'

describe('doc-kind helpers', () => {
  it('creates a versioned text doc with empty TipTap content', () => {
    expect(createTextDoc('doc-1', 'user-1')).toEqual({
      id: 'doc-1',
      schemaVersion: 2,
      kind: 'doc',
      userId: 'user-1',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    })
  })

  it('omits userId when creating an anonymous draft', () => {
    expect(createTextDoc('doc-1')).toEqual({
      id: 'doc-1',
      schemaVersion: 2,
      kind: 'doc',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    })
  })

  it('identifies text docs structurally', () => {
    expect(isTextDoc(createTextDoc('doc-1'))).toBe(true)
    expect(isTextDoc({ id: 'doc-1', kind: 'space' })).toBe(false)
    expect(isTextDoc(null)).toBe(false)
  })

  it('identifies existing canvas spaces', () => {
    expect(isSpaceDoc({ id: 'space-1', kind: 'space', version: 2, lastSequence: 0, nodes: [], edges: [] })).toBe(true)
    expect(isSpaceDoc(createTextDoc('doc-1'))).toBe(false)
  })
})
```

- [ ] Run and expect FAIL because the files do not exist.

```bash
yarn test src/lib/doc-kind.test.ts
```

- [ ] Create `src/types/doc.d.ts`:

```ts
export type TipTapJSON = {
  type?: string
  attrs?: Record<string, unknown>
  content?: TipTapJSON[]
  text?: string
  marks?: Array<{
    type: string
    attrs?: Record<string, unknown>
  }>
  [key: string]: unknown
}

export type TextDocData = {
  id: string
  schemaVersion: 2
  kind: 'doc'
  title?: string
  userId?: string
  content: TipTapJSON
}
```

- [ ] Create `src/lib/doc-kind.ts`:

```ts
import type { DinkyDataV2 } from './dinky-api.js'
import type { TextDocData } from '../types/doc.js'

export function isTextDoc(value: unknown): value is TextDocData {
  if (!value || typeof value !== 'object') return false
  const doc = value as Partial<TextDocData>
  return doc.kind === 'doc' && doc.schemaVersion === 2 && !!doc.content && typeof doc.id === 'string'
}

export function isSpaceDoc(value: unknown): value is DinkyDataV2 {
  if (!value || typeof value !== 'object') return false
  const doc = value as Partial<DinkyDataV2>
  return (doc.kind === undefined || doc.kind === 'space') && doc.version === 2 && Array.isArray(doc.nodes) && Array.isArray(doc.edges)
}

export function createTextDoc(id: string, userId?: string): TextDocData {
  return {
    id,
    schemaVersion: 2,
    kind: 'doc',
    ...(userId ? { userId } : {}),
    content: {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
  }
}
```

- [ ] Run and expect PASS.

```bash
yarn test src/lib/doc-kind.test.ts
```

- [ ] Commit.

```bash
git add src/types/doc.d.ts src/lib/doc-kind.ts src/lib/doc-kind.test.ts
git commit -m "Add text document data helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 4: Add the TipTap `DocEditor` component

**Files:** Create `src/components/doc/DocEditor.tsx`; Test `src/components/doc/DocEditor.test.tsx`

**Interfaces:**  
Consumes: `TextDocData`, `TipTapJSON`.  
Produces:
`type DocEditorProps = { doc: TextDocData; editable: boolean; onTitleChange: (title: string) => void; onContentChange: (content: TipTapJSON) => void }`  
`DocEditor(props: DocEditorProps): JSX.Element`

- [ ] Create failing render tests in `src/components/doc/DocEditor.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTextDoc } from '../../lib/doc-kind.js'
import { DocEditor } from './DocEditor.js'

describe('DocEditor', () => {
  it('renders title input and editable TipTap region for owners', () => {
    const onTitleChange = vi.fn()
    const onContentChange = vi.fn()
    const doc = { ...createTextDoc('doc-1'), title: 'RFC Draft' }

    render(
      <DocEditor
        doc={doc}
        editable={true}
        onTitleChange={onTitleChange}
        onContentChange={onContentChange}
      />,
    )

    const title = screen.getByLabelText('Document title')
    fireEvent.change(title, { target: { value: 'Updated RFC' } })

    expect(title).toHaveValue('Updated RFC')
    expect(onTitleChange).toHaveBeenCalledWith('Updated RFC')
    expect(screen.getByTestId('doc-editor-content')).toHaveAttribute('contenteditable', 'true')
  })

  it('renders read-only controls for non-owners', () => {
    const doc = { ...createTextDoc('doc-1'), title: 'Read Only RFC' }

    render(
      <DocEditor
        doc={doc}
        editable={false}
        onTitleChange={vi.fn()}
        onContentChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Document title')).toBeDisabled()
    expect(screen.getByTestId('doc-editor-content')).toHaveAttribute('contenteditable', 'false')
  })
})
```

- [ ] Run and expect FAIL because `DocEditor` does not exist.

```bash
yarn test src/components/doc/DocEditor.test.tsx
```

- [ ] Create `src/components/doc/DocEditor.tsx`:

```tsx
import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { TextDocData, TipTapJSON } from '../../types/doc.js'

type DocEditorProps = {
  doc: TextDocData
  editable: boolean
  onTitleChange: (title: string) => void
  onContentChange: (content: TipTapJSON) => void
}

export function DocEditor({ doc, editable, onTitleChange, onContentChange }: DocEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: doc.content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON() as TipTapJSON)
    },
  })

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor) return
    const current = editor.getJSON()
    if (JSON.stringify(current) !== JSON.stringify(doc.content)) {
      editor.commands.setContent(doc.content)
    }
  }, [editor, doc.content])

  return (
    <main className="DocEditor">
      <input
        aria-label="Document title"
        className="DocEditor_title"
        disabled={!editable}
        placeholder="Untitled document"
        value={doc.title ?? ''}
        onChange={(event) => onTitleChange(event.target.value)}
      />
      <EditorContent
        className="DocEditor_content"
        data-testid="doc-editor-content"
        editor={editor}
      />
    </main>
  )
}
```

- [ ] Run and expect PASS.

```bash
yarn test src/components/doc/DocEditor.test.tsx
```

- [ ] Manual CSS verification note: no CSS is required for the unit deliverable; visual polish is verified in Task 5 with `yarn dev`.

- [ ] Commit.

```bash
git add src/components/doc/DocEditor.tsx src/components/doc/DocEditor.test.tsx
git commit -m "Add TipTap document editor component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 5: Add `DocEditorPage` with owner autosave and beforeunload beacon

**Files:** Create `src/hooks/useTextDocState.ts`, `src/pages/DocEditorPage.tsx`; Modify `src/lib/dinky-api.ts:1-118`; Test `src/hooks/useTextDocState.test.tsx`

**Interfaces:**  
Consumes:
`createTextDoc(id: string, userId?: string): TextDocData`  
`loadDoc(id: string): Promise<DinkyDataV2 | TextDocData>` after this task  
`saveDoc(data: DinkyDataV2 | TextDocData, userId: string): Promise<{ status: number; key: string }>` after this task  
`saveDocBeacon(data: DinkyDataV2 | TextDocData, accessToken: string, userId: string): void` after this task  
Produces:
`type AnyDocData = DinkyDataV2 | TextDocData`  
`useTextDocState(id: string): { doc: TextDocData | null; isOwner: boolean; isLocked: boolean; isLoading: boolean; onTitleChange(title: string): void; onContentChange(content: TipTapJSON): void; onPostLoginSave(): void }`  
`DocEditorPage(): JSX.Element`

- [ ] Update `src/lib/dinky-api.ts` data types so text docs compile:

```ts
import type { CanvasProps } from '../types/canvas.js'
import type { TextDocData } from '../types/doc.js'
import { stripHtml } from './sanitize-html.js'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js'

export type DocumentKind = 'space' | 'doc'

export type DinkyDataV2 = CanvasProps & {
  id: string
  kind: 'space'
  lastSequence: number
  title?: string
  backgroundColor?: string
  version: 2
  userId?: string
}

export type AnyDocData = DinkyDataV2 | TextDocData

export type DocumentsClient = {
  from: (table: 'documents') => {
    select: (columns: string, options?: { count?: 'exact' }) => unknown
    upsert?: (payload: unknown) => Promise<{ error: unknown }>
    delete?: () => unknown
  }
}

type DocumentRow = {
  id?: string
  data: string
  user_id?: string
  kind?: DocumentKind | null
  updated_at?: string
}

export type SpaceMeta = {
  id: string
  title?: string
  backgroundColor?: string
  updated_at?: string
  kind: DocumentKind
}

function getRowKind(row: Pick<DocumentRow, 'kind'>): DocumentKind {
  return row.kind === 'doc' ? 'doc' : 'space'
}

export async function loadDoc(id: string, client = supabase): Promise<AnyDocData> {
  const { data: row, error } = await client
    .from('documents')
    .select('data, user_id, kind')
    .eq('id', id)
    .maybeSingle()

  if (error || !row) {
    throw new Error(error?.message || 'Document not found')
  }

  const typedRow = row as DocumentRow
  const kind = getRowKind(typedRow)
  const data = JSON.parse(typedRow.data)

  return { ...data, userId: typedRow.user_id, kind }
}

export async function saveDoc(data: AnyDocData, userId: string, client = supabase): Promise<{ status: number; key: string }> {
  const kind = data.kind ?? 'space'
  const encData = JSON.stringify({ ...data, kind })
  const { error } = await client
    .from('documents')
    .upsert({ id: data.id, data: encData, user_id: userId, kind })

  if (error) {
    throw error
  }
  return { status: 200, key: data.id }
}

export function saveDocBeacon(data: AnyDocData, accessToken: string, userId: string): void {
  const url = `${SUPABASE_URL}/rest/v1/documents?on_conflict=id`
  const kind = data.kind ?? 'space'
  const encData = JSON.stringify({ ...data, kind })
  const body = JSON.stringify({ id: data.id, data: encData, user_id: userId, kind })
  void fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body,
    keepalive: true,
  })
}

export async function listDocsPage(userId: string, page = 1, perPage = 12, client = supabase): Promise<{ spaces: SpaceMeta[]; total: number }> {
  if (!userId) {
    return { spaces: [], total: 0 }
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const makeQueryWithTimestamp = () =>
    client
      .from('documents')
      .select('id, data, updated_at, kind', { count: 'exact' })
      .eq('user_id', userId)

  const makeQueryWithoutTimestamp = () =>
    client
      .from('documents')
      .select('id, data, kind', { count: 'exact' })
      .eq('user_id', userId)

  let { data, count, error } = await makeQueryWithTimestamp()
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (error?.code === '42703') {
    const fallback = await makeQueryWithoutTimestamp().range(from, to)
    data = fallback.data as typeof data
    count = fallback.count
    error = fallback.error
  }

  if (error || !data) {
    throw error || new Error('Unable to load documents')
  }

  const spaces = data.map((row: DocumentRow) => {
    try {
      const parsed = JSON.parse(row.data)
      return {
        id: row.id || '',
        title: parsed.title || stripHtml(parsed.nodes?.[0]?.content || ''),
        backgroundColor: parsed.backgroundColor,
        updated_at: row.updated_at,
        kind: getRowKind(row),
      } as SpaceMeta
    } catch {
      return { id: row.id || '', updated_at: row.updated_at, kind: getRowKind(row) } as SpaceMeta
    }
  })
  return { spaces, total: count || spaces.length }
}

export async function deleteDoc(id: string) {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) {
    throw error
  }
}
```

- [ ] Create failing hook tests in `src/hooks/useTextDocState.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { useSession } from '@supabase/auth-helpers-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTextDoc } from '../lib/doc-kind.js'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api.js'
import { useTextDocState } from './useTextDocState.js'

vi.mock('@supabase/auth-helpers-react', () => ({
  useSession: vi.fn(),
}))

vi.mock('../lib/dinky-api.js', () => ({
  loadDoc: vi.fn(),
  saveDoc: vi.fn(),
  saveDocBeacon: vi.fn(),
}))

describe('useTextDocState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useSession).mockReturnValue({
      access_token: 'token-1',
      user: { id: 'user-1' },
    } as ReturnType<typeof useSession>)
    vi.mocked(loadDoc).mockResolvedValue({ ...createTextDoc('doc-1', 'user-1'), title: 'RFC' })
    vi.mocked(saveDoc).mockResolvedValue({ status: 200, key: 'doc-1' })
    vi.mocked(saveDocBeacon).mockReturnValue(undefined)
  })

  it('loads an existing text document and marks the owner editable', async () => {
    const { result } = renderHook(() => useTextDocState('doc-1'))

    await waitFor(() => expect(result.current.doc?.title).toBe('RFC'))

    expect(result.current.isOwner).toBe(true)
    expect(result.current.isLocked).toBe(false)
  })

  it('creates a draft text document when load misses', async () => {
    vi.mocked(loadDoc).mockRejectedValueOnce(new Error('Document not found'))

    const { result } = renderHook(() => useTextDocState('doc-new'))

    await waitFor(() => expect(result.current.doc?.id).toBe('doc-new'))

    expect(result.current.doc).toMatchObject({
      id: 'doc-new',
      kind: 'doc',
      schemaVersion: 2,
      userId: 'user-1',
    })
  })

  it('debounces owner autosave after title changes', async () => {
    const { result } = renderHook(() => useTextDocState('doc-1'))

    await waitFor(() => expect(result.current.doc).not.toBeNull())

    act(() => {
      result.current.onTitleChange('Updated RFC')
    })

    expect(saveDoc).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(saveDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc-1', title: 'Updated RFC', kind: 'doc' }),
      'user-1',
    )
  })

  it('saves with beacon before unload for owners with changes', async () => {
    const { result } = renderHook(() => useTextDocState('doc-1'))

    await waitFor(() => expect(result.current.doc).not.toBeNull())

    act(() => {
      result.current.onTitleChange('Beacon RFC')
    })

    window.dispatchEvent(new Event('beforeunload'))

    expect(saveDocBeacon).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc-1', title: 'Beacon RFC', kind: 'doc' }),
      'token-1',
      'user-1',
    )
  })
})
```

- [ ] Run and expect FAIL because `useTextDocState` does not exist.

```bash
yarn test src/hooks/useTextDocState.test.tsx
```

- [ ] Create `src/hooks/useTextDocState.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import { createTextDoc, isTextDoc } from '../lib/doc-kind.js'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api.js'
import type { TextDocData, TipTapJSON } from '../types/doc.js'
import { setUrlId } from '../lib/url.js'
import { useBeforeUnload } from './useBeforeUnload.js'

const AUTOSAVE_MS = 800

export function useTextDocState(id: string) {
  const session = useSession()
  const userId = session?.user?.id || ''
  const [doc, setDoc] = useState<TextDocData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const originalDoc = useRef('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stringDoc = useMemo(() => JSON.stringify(doc), [doc])
  const isOwner = !doc?.userId || doc.userId === userId
  const isLocked = !isOwner || !userId

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    loadDoc(id)
      .then((loaded) => {
        if (cancelled) return
        if (!isTextDoc(loaded)) {
          throw new Error('Loaded document is not a text document')
        }
        setDoc(loaded)
        originalDoc.current = JSON.stringify(loaded)
        setUrlId(loaded.id, loaded.title, 'doc')
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof Error && err.message === 'Document not found') {
          const draft = createTextDoc(id, userId || undefined)
          setDoc(draft)
          originalDoc.current = JSON.stringify(draft)
          setUrlId(draft.id, draft.title, 'doc')
          return
        }
        console.error('Error loading text document', err)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, userId])

  useEffect(() => {
    if (!doc || !isOwner || !userId) return
    if (stringDoc === originalDoc.current) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const docToSave = { ...doc, userId }
      saveDoc(docToSave, userId)
        .then(() => {
          originalDoc.current = JSON.stringify(docToSave)
          setDoc(docToSave)
          setUrlId(docToSave.id, docToSave.title, 'doc')
        })
        .catch((err) => console.error('Error saving text document', err))
    }, AUTOSAVE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [doc, isOwner, stringDoc, userId])

  useBeforeUnload(useCallback(() => {
    if (!doc || !isOwner || !userId) return
    if (JSON.stringify(doc) === originalDoc.current) return

    const docToSave = { ...doc, userId }
    if (session?.access_token) {
      saveDocBeacon(docToSave, session.access_token, userId)
    } else {
      saveDoc(docToSave, userId).catch((err) => console.error('Error saving text document', err))
    }
  }, [doc, isOwner, session, userId]))

  useEffect(() => {
    document.title = doc?.title ? `SpaceNotes — ${doc.title}` : 'SpaceNotes'
  }, [doc?.title])

  const onTitleChange = useCallback((title: string) => {
    setDoc((current) => current ? { ...current, title } : current)
  }, [])

  const onContentChange = useCallback((content: TipTapJSON) => {
    setDoc((current) => current ? { ...current, content } : current)
  }, [])

  const onPostLoginSave = useCallback(() => {
    if (!doc || !userId) return

    const docToSave = { ...doc, userId }
    saveDoc(docToSave, userId)
      .then(() => {
        originalDoc.current = JSON.stringify(docToSave)
        setDoc(docToSave)
        setUrlId(docToSave.id, docToSave.title, 'doc')
      })
      .catch((err) => console.error('Error saving text document after login', err))
  }, [doc, userId])

  return {
    doc,
    isOwner,
    isLocked,
    isLoading,
    onTitleChange,
    onContentChange,
    onPostLoginSave,
  }
}
```

- [ ] Create `src/pages/DocEditorPage.tsx`:

```tsx
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
```

- [ ] Run and expect PASS.

```bash
yarn test src/hooks/useTextDocState.test.tsx src/lib/dinky-api.test.ts
```

- [ ] Manual verification after routing task: run `yarn dev`, open `http://localhost:8080/?q=manual-doc-1&kind=doc`, sign in, type a title/body, wait one second, reload, and observe the title/body persist. Before routing exists, the page is only unit-verified.

- [ ] Commit.

```bash
git add src/lib/dinky-api.ts src/hooks/useTextDocState.ts src/hooks/useTextDocState.test.tsx src/pages/DocEditorPage.tsx
git commit -m "Add text document page state and autosave

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 6: Route spaces and documents by kind

**Files:** Modify `src/lib/url.ts:1-38`, `src/pages/EditorPage.tsx:1-10`, `src/hooks/useInitApp.ts:1-218`, `src/components/App.tsx:1-18`; Test `src/lib/url.test.ts`, `src/pages/EditorPage.test.tsx`

**Interfaces:**  
Consumes: `loadDoc(id): Promise<AnyDocData>`, `isSpaceDoc`, `DocEditorPage`.  
Produces:
`getUrlKind(): DocumentKind | ''`  
`setUrlId(id: string, title?: string, kind?: DocumentKind): void`  
`makeUrl(id: string, title?: string, kind?: DocumentKind): string`  
`EditorPage(): JSX.Element` that branches to `DocEditorPage` for `kind === 'doc'`.

- [ ] Create failing URL tests in `src/lib/url.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getUrlKind, makeUrl, setUrlId } from './url.js'

describe('url helpers', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost/')
  })

  it('writes kind for document URLs', () => {
    setUrlId('doc-1', 'RFC Draft', 'doc')
    expect(window.location.search).toBe('?q=RFC-Draft_doc-1&kind=doc')
    expect(getUrlKind()).toBe('doc')
  })

  it('omits kind for space URLs', () => {
    setUrlId('space-1', 'Canvas', 'space')
    expect(window.location.search).toBe('?q=Canvas_space-1')
    expect(getUrlKind()).toBe('')
  })

  it('makes document URLs', () => {
    expect(makeUrl('doc-1', 'RFC Draft', 'doc')).toBe('http://localhost/?q=RFC-Draft_doc-1&kind=doc')
  })
})
```

- [ ] Run and expect FAIL.

```bash
yarn test src/lib/url.test.ts
```

- [ ] Replace `src/lib/url.ts` with:

```ts
import type { DocumentKind } from './dinky-api.js'

export function getUrlId() {
  const url = new URL(window.location.href)
  const q = url.searchParams.get('q')
  return q ? q.replace(/(.+?_)?(.+)$/gi, '$2') : ''
}

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
}

function addPrefix(id: string, title?: string) {
  const prefix = title ? slugify(title.slice(0, 50)) : ''
  return prefix ? `${prefix}_${id}` : id
}

export function getUrlKind(): DocumentKind | '' {
  const url = new URL(window.location.href)
  return url.searchParams.get('kind') === 'doc' ? 'doc' : ''
}

export function setUrlId(id: string, title?: string, kind?: DocumentKind) {
  const url = new URL(window.location.href)
  url.searchParams.set('q', addPrefix(id, title))
  if (kind === 'doc') {
    url.searchParams.set('kind', 'doc')
  } else {
    url.searchParams.delete('kind')
  }
  window.history.replaceState({}, '', url.toString())
}

export function makeUrl(id: string, title?: string, kind?: DocumentKind) {
  const url = new URL(window.location.origin)
  url.searchParams.set('q', addPrefix(id, title))
  if (kind === 'doc') {
    url.searchParams.set('kind', 'doc')
  }
  return url.toString()
}

export function getUrlPage() {
  const url = new URL(window.location.href)
  const p = parseInt(url.searchParams.get('page') || '1', 10)
  return Number.isFinite(p) && p > 0 ? p : 1
}

export function setUrlPage(page: number) {
  const url = new URL(window.location.href)
  url.searchParams.set('page', String(page))
  window.history.replaceState({}, '', url.toString())
}
```

- [ ] Run and expect PASS.

```bash
yarn test src/lib/url.test.ts
```

- [ ] Create failing route tests in `src/pages/EditorPage.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDoc } from '../lib/dinky-api.js'
import { createTextDoc } from '../lib/doc-kind.js'
import { EditorPage } from './EditorPage.js'

vi.mock('../lib/dinky-api.js', () => ({
  loadDoc: vi.fn(),
}))

vi.mock('../components/Editor.js', () => ({
  Editor: () => <div data-testid="space-editor" />,
}))

vi.mock('../context/DocumentContext.js', () => ({
  DocumentProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="document-provider">{children}</div>,
}))

vi.mock('./DocEditorPage.js', () => ({
  DocEditorPage: () => <div data-testid="doc-editor-page" />,
}))

describe('EditorPage routing', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost/?q=doc-1')
    vi.mocked(loadDoc).mockReset()
  })

  it('routes loaded text docs to DocEditorPage', async () => {
    vi.mocked(loadDoc).mockResolvedValue(createTextDoc('doc-1'))

    render(<EditorPage />)

    await waitFor(() => expect(screen.getByTestId('doc-editor-page')).toBeInTheDocument())
  })

  it('routes loaded spaces to the existing Editor inside DocumentProvider', async () => {
    vi.mocked(loadDoc).mockResolvedValue({
      id: 'space-1',
      kind: 'space',
      version: 2,
      lastSequence: 0,
      nodes: [],
      edges: [],
    })

    render(<EditorPage />)

    await waitFor(() => expect(screen.getByTestId('document-provider')).toBeInTheDocument())
    expect(screen.getByTestId('space-editor')).toBeInTheDocument()
  })

  it('routes new document URLs to DocEditorPage without an existing row', async () => {
    window.history.replaceState({}, '', 'http://localhost/?q=doc-new&kind=doc')
    vi.mocked(loadDoc).mockRejectedValue(new Error('Document not found'))

    render(<EditorPage />)

    await waitFor(() => expect(screen.getByTestId('doc-editor-page')).toBeInTheDocument())
  })
})
```

- [ ] Run and expect FAIL because `EditorPage` does not branch.

```bash
yarn test src/pages/EditorPage.test.tsx
```

- [ ] Replace `src/pages/EditorPage.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { Editor } from '../components/Editor.js'
import { DocumentProvider } from '../context/DocumentContext.js'
import { loadDoc, type DocumentKind } from '../lib/dinky-api.js'
import { getUrlId, getUrlKind } from '../lib/url.js'
import { DocEditorPage } from './DocEditorPage.js'

export function EditorPage() {
  const [kind, setKind] = useState<DocumentKind | null>(null)

  useEffect(() => {
    const id = getUrlId()
    const urlKind = getUrlKind()

    if (!id) {
      setKind('space')
      return
    }

    if (urlKind === 'doc') {
      loadDoc(id)
        .then((doc) => setKind(doc.kind))
        .catch(() => setKind('doc'))
      return
    }

    loadDoc(id)
      .then((doc) => setKind(doc.kind))
      .catch(() => setKind('space'))
  }, [])

  if (!kind) {
    return <div>Loading...</div>
  }

  if (kind === 'doc') {
    return <DocEditorPage />
  }

  return (
    <DocumentProvider>
      <Editor />
    </DocumentProvider>
  )
}
```

- [ ] Patch `src/hooks/useInitApp.ts` imports to `.js` extensions and reject non-space docs in the loader. Replace the import block and the `loadDoc(id).then` body at existing lines `1-7` and `47-54` with:

```ts
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { getUrlId, setUrlId, makeUrl } from '../lib/url.js'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api.js'
import { useBeforeUnload } from './useBeforeUnload.js'
import { randomId } from '../lib/utils.js'
import { type useDocState } from './useDocState.js'
import { useSession } from '@supabase/auth-helpers-react'
import { isSpaceDoc } from '../lib/doc-kind.js'
```

```ts
loadDoc(id)
  .then((newDoc) => {
    if (!isSpaceDoc(newDoc)) {
      throw new Error('Loaded document is not a space')
    }
    console.log('Loaded doc', id, newDoc)
    originalDoc.current = JSON.stringify(newDoc)
    setDoc(newDoc)
    setUrlId(newDoc.id, newDoc.title, 'space')
  })
  .catch((err) => {
    console.error('Error loading doc', err)
  })
```

- [ ] Replace `src/components/App.tsx` with this no-behavior-change version that keeps routing delegated:

```tsx
import { useEffect, useState } from 'react'
import { EditorPage } from '../pages/EditorPage.js'
import { getUrlId, setUrlId } from '../lib/url.js'
import { randomId } from '../lib/utils.js'

export function App() {
  const [id, setId] = useState(() => getUrlId())

  useEffect(() => {
    if (!id) {
      const newId = randomId()
      setUrlId(newId, undefined, 'space')
      setId(newId)
    }
  }, [id])

  return <EditorPage />
}
```

- [ ] Run and expect PASS.

```bash
yarn test src/lib/url.test.ts src/pages/EditorPage.test.tsx src/hooks/useTextDocState.test.tsx
```

- [ ] Run build and expect PASS.

```bash
yarn build
```

- [ ] Commit.

```bash
git add src/lib/url.ts src/lib/url.test.ts src/pages/EditorPage.tsx src/pages/EditorPage.test.tsx src/hooks/useInitApp.ts src/components/App.tsx
git commit -m "Route documents by kind

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 7: Add Sidebar Space/Document creation and mixed-kind list icons

**Files:** Modify `src/components/Sidebar.tsx:1-239`; Test `src/components/Sidebar.test.tsx`

**Interfaces:**  
Consumes: `SpaceMeta.kind`, `makeUrl(id, title, kind)`.  
Produces: Sidebar links for new Space and new Document; visual icon label for `space` versus `doc`.

- [ ] Create failing sidebar tests in `src/components/Sidebar.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from '@supabase/auth-helpers-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listDocsPage } from '../lib/dinky-api.js'
import { Sidebar } from './Sidebar.js'

vi.mock('@supabase/auth-helpers-react', () => ({
  useSession: vi.fn(),
}))

vi.mock('../services/supabaseService.js', () => ({
  signOut: vi.fn(),
}))

vi.mock('../lib/dinky-api.js', () => ({
  listDocsPage: vi.fn(),
}))

describe('Sidebar document kinds', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      user: { id: 'user-1', email: 'ada@example.com' },
    } as ReturnType<typeof useSession>)
    vi.mocked(listDocsPage).mockResolvedValue({
      total: 2,
      spaces: [
        { id: 'space-1', title: 'Canvas', kind: 'space' },
        { id: 'doc-1', title: 'RFC', kind: 'doc' },
      ],
    })
  })

  it('offers separate new Space and Document links', async () => {
    render(
      <Sidebar
        isOpen={true}
        onClose={vi.fn()}
        onFork={vi.fn()}
        onShareSession={vi.fn()}
        isOwner={true}
        onSignIn={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: 'New space' })).toHaveAttribute('href', expect.not.stringContaining('kind=doc'))
    expect(screen.getByRole('link', { name: 'New document' })).toHaveAttribute('href', expect.stringContaining('kind=doc'))
  })

  it('renders kind-specific labels in the document list', async () => {
    render(
      <Sidebar
        isOpen={true}
        onClose={vi.fn()}
        onFork={vi.fn()}
        onShareSession={vi.fn()}
        isOwner={true}
        onSignIn={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.getByText('Canvas')).toBeInTheDocument())

    expect(screen.getByLabelText('Space')).toBeInTheDocument()
    expect(screen.getByLabelText('Document')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /RFC/ })).toHaveAttribute('href', expect.stringContaining('kind=doc'))
  })
})
```

- [ ] Run and expect FAIL because sidebar only has `+ New space` and no kind icons.

```bash
yarn test src/components/Sidebar.test.tsx
```

- [ ] Replace `src/components/Sidebar.tsx` with:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { makeUrl, getUrlId } from '../lib/url.js'
import { ForkButton } from './ForkButton.js'
import { signOut } from '../services/supabaseService.js'
import { listDocsPage, type SpaceMeta } from '../lib/dinky-api.js'
import { useSession } from '@supabase/auth-helpers-react'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
  isLocked?: boolean
  onFork: () => void
  onShareSession: () => void
  isOwner?: boolean
  onSignIn: () => void
}

const ITEMS_PER_PAGE = 100

function getSpaceColor(title: string): string {
  const colors = [
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#F97316',
    '#EAB308',
    '#22C55E',
    '#14B8A6',
  ]
  const hash = title?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0
  return colors[hash % colors.length]
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function KindIcon({ doc }: { doc: SpaceMeta }) {
  if (doc.kind === 'doc') {
    return (
      <div className="SpaceItemIcon SpaceItemIcon_doc" aria-label="Document">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h8" />
        </svg>
      </div>
    )
  }

  const color = getSpaceColor(doc.title || doc.id)
  const initial = (doc.title || 'U')[0].toUpperCase()
  return (
    <div className="SpaceItemIcon" aria-label="Space" style={{ backgroundColor: color }}>
      {initial}
    </div>
  )
}

export function Sidebar({ isOpen, onClose, isLocked, onFork, onShareSession, isOwner, onSignIn }: SidebarProps) {
  const [docs, setDocs] = useState<SpaceMeta[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const session = useSession()
  const userId = session?.user?.id || ''
  const userEmail = session?.user?.email || ''
  const currentId = getUrlId()

  const loadDocs = useCallback(async (p: number) => {
    if (!userId) return
    try {
      const { spaces, total } = await listDocsPage(userId, p, ITEMS_PER_PAGE)
      const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
      setDocs(spaces)
      setTotalPages(pages)
      if (p > pages) setPage(pages)
    } catch (err) {
      console.error('Error loading spaces', err)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen && userId) {
      loadDocs(page)
    }
  }, [isOpen, page, loadDocs, userId])

  const onSignOut = useCallback(() => {
    signOut()
  }, [])

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const filteredDocs = searchQuery
    ? docs.filter(doc => doc.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : docs

  const userInitials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className={`Sidebar${isLocked ? ' Sidebar_locked' : ''}`}>
      <div
        className="Sidebar_drawer"
        style={{ transform: `translateX(${isOpen ? 0 : '100%'})` }}
        onClick={stopPropagation}
      >
        <div className="MenuHeader">
          <div className="MenuHeaderLeft">
            <div className="LogoIcon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <span className="MenuTitle">SpaceNotes</span>
          </div>
          <button className="CloseBtn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {userId && (
          <div className="MenuActions">
            <a href={makeUrl(Math.random().toString(36).slice(2), undefined, 'space')} aria-label="New space">
              <button className="Button_primary">New space</button>
            </a>
            <a href={makeUrl(Math.random().toString(36).slice(2), undefined, 'doc')} aria-label="New document">
              <button className="Button_secondary">New document</button>
            </a>
            {isLocked ? (
              <ForkButton onFork={onFork} />
            ) : isOwner && (
              <button className="Button_secondary" onClick={onShareSession}>
                Invite
              </button>
            )}
          </div>
        )}

        {userId && (
          <div className="SearchBar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search spaces and documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {userId && (
          <div className="SpacesSection">
            <div className="SpacesSectionHeader">
              <span className="SpacesSectionTitle">Your Spaces</span>
              <span className="SpacesCount">{filteredDocs.length}</span>
            </div>
            <div className="SpacesList">
              {filteredDocs.map((doc) => {
                const isActive = doc.id === currentId

                return (
                  <a
                    key={doc.id}
                    href={makeUrl(doc.id, doc.title, doc.kind)}
                    className={`SpaceItem${isActive ? ' SpaceItem_active' : ''}`}
                  >
                    <KindIcon doc={doc} />
                    <div className="SpaceItemContent">
                      <div className="SpaceItemTitle">{doc.title || 'Untitled'}</div>
                      <div className="SpaceItemMeta">{formatTimeAgo(doc.updated_at)}</div>
                    </div>
                  </a>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="Sidebar_pagination">
                <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  Prev
                </button>
                <span>{page} / {totalPages}</span>
                <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        <div className="MenuFooter">
          {userId ? (
            <>
              <div className="UserSection">
                <div className="UserAvatar">{userInitials}</div>
                <div className="UserInfo">
                  <div className="UserName">{userEmail.split('@')[0]}</div>
                  <div className="UserEmail">{userEmail}</div>
                </div>
              </div>
              <button className="SignOutBtn" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <button className="Button_primary" onClick={onSignIn} style={{ width: '100%' }}>
              Sign in / Sign up
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
```

- [ ] Run and expect PASS.

```bash
yarn test src/components/Sidebar.test.tsx
```

- [ ] Run all unit tests and build.

```bash
yarn test
yarn build
```

- [ ] Run existing production e2e smoke unchanged.

```bash
yarn test:e2e
```

- [ ] Commit.

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "Add document creation to sidebar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

## Out of scope (Phases 2 & 3)

Phase 2 comments are intentionally excluded: no anchors, inline comments, comment storage, or realtime discussion UI.
Phase 3 versions are intentionally excluded: no immutable snapshots, restore flow, diff UI, or version list.
This phase only establishes document kind, document editor, create/list/open flows, and owner autosave.

## Manual verification checklist

- [ ] `yarn test` passes.
- [ ] `yarn build` passes.
- [ ] `yarn test:e2e` keeps the existing production smoke test green.
- [ ] `yarn dev` starts on `http://localhost:8080`.
- [ ] Opening `/` with no `q` still auto-creates a space URL and shows the existing board.
- [ ] Existing space URL `/?q=about_about-9315ba924c9d16e632145116d69ae72a` still shows `.Board`.
- [ ] Sidebar while signed in shows `New space` and `New document`.
- [ ] `New space` opens a normal board URL without `kind=doc`.
- [ ] `New document` opens a text editor URL with `kind=doc`.
- [ ] Signed-in document owner can edit title and body; reload after one second shows saved content.
- [ ] Anonymous or non-owner document view renders read-only editor controls.
- [ ] Sidebar list shows different visual markers for `space` and `doc` rows and opens docs with `kind=doc`.
