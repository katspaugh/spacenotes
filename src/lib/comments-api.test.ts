import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./supabase.js', () => ({
  supabase: {},
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-anon-key',
}))

import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
  type CommentsClient,
  type NewComment,
} from './comments-api.js'

type QueryResult = {
  data?: unknown
  error?: { message?: string; code?: string } | null
}

class QueryBuilder {
  selected = ''
  insertPayload: unknown
  updatePayload: unknown
  deleteCalled = false
  eqArgs: Array<[string, unknown]> = []
  orderArgs: [string, { ascending?: boolean } | undefined] | null = null
  singleCalled = false

  constructor(private result: QueryResult) {}

  select(columns = '*') {
    this.selected = columns
    return this
  }

  insert(payload: unknown) {
    this.insertPayload = payload
    return this
  }

  update(payload: unknown) {
    this.updatePayload = payload
    return this
  }

  delete() {
    this.deleteCalled = true
    return this
  }

  eq(column: string, value: unknown) {
    this.eqArgs.push([column, value])
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderArgs = [column, options]
    return Promise.resolve(this.result)
  }

  single() {
    this.singleCalled = true
    return Promise.resolve(this.result)
  }

  // Awaitable so update/delete chains resolve when awaited.
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

class FakeCommentsClient {
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

function makeClient(result: QueryResult) {
  return new FakeCommentsClient(result) as unknown as CommentsClient & {
    builder: QueryBuilder
    table: string
  }
}

const dbRow = {
  id: 'c-1',
  doc_id: 'doc-1',
  thread_id: 't-1',
  parent_id: null,
  author_id: 'user-1',
  author_name: 'Ada',
  body: 'Looks good',
  anchor: { from: 4, to: 9, quote: 'quick' },
  resolved: false,
  created_at: '2026-06-30T12:00:00Z',
}

const mappedComment = {
  id: 'c-1',
  docId: 'doc-1',
  threadId: 't-1',
  parentId: null,
  authorId: 'user-1',
  authorName: 'Ada',
  body: 'Looks good',
  anchor: { from: 4, to: 9, quote: 'quick' },
  resolved: false,
  createdAt: '2026-06-30T12:00:00Z',
}

describe('comments-api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('listComments selects by doc_id ordered by created_at and maps rows', async () => {
    const client = makeClient({ data: [dbRow] })

    await expect(listComments('doc-1', client)).resolves.toEqual([mappedComment])
    expect(client.table).toBe('comments')
    expect(client.builder.selected).toBe('*')
    expect(client.builder.eqArgs).toEqual([['doc_id', 'doc-1']])
    expect(client.builder.orderArgs).toEqual(['created_at', { ascending: true }])
  })

  it('listComments returns an empty array when there are no rows', async () => {
    const client = makeClient({ data: null })
    await expect(listComments('doc-1', client)).resolves.toEqual([])
  })

  it('createComment inserts snake_case payload and returns the mapped comment', async () => {
    const client = makeClient({ data: dbRow })
    const input: NewComment = {
      docId: 'doc-1',
      threadId: 't-1',
      authorId: 'user-1',
      authorName: 'Ada',
      body: 'Looks good',
      anchor: { from: 4, to: 9, quote: 'quick' },
    }

    await expect(createComment(input, client)).resolves.toEqual(mappedComment)
    expect(client.table).toBe('comments')
    expect(client.builder.insertPayload).toEqual({
      doc_id: 'doc-1',
      thread_id: 't-1',
      parent_id: null,
      author_id: 'user-1',
      author_name: 'Ada',
      body: 'Looks good',
      anchor: { from: 4, to: 9, quote: 'quick' },
    })
    expect(client.builder.singleCalled).toBe(true)
  })

  it('updateComment updates resolved filtered by id', async () => {
    const client = makeClient({})

    await expect(updateComment('c-1', { resolved: true }, client)).resolves.toBeUndefined()
    expect(client.builder.updatePayload).toEqual({ resolved: true })
    expect(client.builder.eqArgs).toEqual([['id', 'c-1']])
  })

  it('updateComment updates body filtered by id', async () => {
    const client = makeClient({})

    await updateComment('c-1', { body: 'Edited' }, client)
    expect(client.builder.updatePayload).toEqual({ body: 'Edited' })
    expect(client.builder.eqArgs).toEqual([['id', 'c-1']])
  })

  it('deleteComment deletes filtered by id', async () => {
    const client = makeClient({})

    await expect(deleteComment('c-1', client)).resolves.toBeUndefined()
    expect(client.builder.deleteCalled).toBe(true)
    expect(client.builder.eqArgs).toEqual([['id', 'c-1']])
  })

  it('listComments throws on error', async () => {
    const client = makeClient({ error: { message: 'boom' } })
    await expect(listComments('doc-1', client)).rejects.toThrow('boom')
  })

  it('createComment throws on error', async () => {
    const client = makeClient({ error: { message: 'nope' } })
    const input: NewComment = {
      docId: 'doc-1',
      threadId: 't-1',
      authorId: 'user-1',
      authorName: 'Ada',
      body: 'x',
    }
    await expect(createComment(input, client)).rejects.toThrow('nope')
  })

  it('deleteComment throws on error', async () => {
    const client = makeClient({ error: { message: 'denied' } })
    await expect(deleteComment('c-1', client)).rejects.toThrow('denied')
  })
})
