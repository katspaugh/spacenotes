import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./supabase.js', () => ({
  supabase: {},
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-anon-key',
}))

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
