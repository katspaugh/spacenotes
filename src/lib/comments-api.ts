import { supabase } from './supabase.js'

// NOTE(Task 5): these types move to src/types/comment.d.ts and are reconciled
// with the thread view-model there. Defined inline here to avoid a forward
// dependency on a not-yet-created module.
export type CommentAnchor = { from: number; to: number; quote: string }

export type Comment = {
  id: string
  docId: string
  threadId: string
  parentId: string | null
  authorId: string
  authorName: string
  body: string
  anchor: CommentAnchor | null
  resolved: boolean
  createdAt: string
}

export type NewComment = {
  docId: string
  threadId: string
  parentId?: string | null
  authorId: string
  authorName: string
  body: string
  anchor?: CommentAnchor | null
}

type QueryResult = {
  data?: unknown
  error?: { message?: string; code?: string } | null
}

// Mirrors the injectable-client pattern in dinky-api.ts. The builder is
// awaitable (PromiseLike) so update/delete chains resolve when awaited, while
// `order`/`single` are explicit terminals.
type CommentsQuery = PromiseLike<QueryResult> & {
  select: (columns?: string) => CommentsQuery
  insert: (payload: unknown) => CommentsQuery
  update: (payload: unknown) => CommentsQuery
  delete: () => CommentsQuery
  eq: (column: string, value: unknown) => CommentsQuery
  order: (column: string, options?: { ascending?: boolean }) => Promise<QueryResult>
  single: () => Promise<QueryResult>
}

export type CommentsClient = {
  from: (table: 'comments') => CommentsQuery
}

type CommentRow = {
  id: string
  doc_id: string
  thread_id: string
  parent_id?: string | null
  author_id: string
  author_name: string
  body: string
  anchor?: CommentAnchor | null
  resolved?: boolean
  created_at: string
}

function mapRow(row: CommentRow): Comment {
  return {
    id: row.id,
    docId: row.doc_id,
    threadId: row.thread_id,
    parentId: row.parent_id ?? null,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    anchor: row.anchor ?? null,
    resolved: row.resolved ?? false,
    createdAt: row.created_at,
  }
}

export async function listComments(
  docId: string,
  client: CommentsClient = supabase as unknown as CommentsClient,
): Promise<Comment[]> {
  const { data, error } = await client
    .from('comments')
    .select('*')
    .eq('doc_id', docId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to load comments')
  }
  return ((data as CommentRow[]) ?? []).map(mapRow)
}

export async function createComment(
  input: NewComment,
  client: CommentsClient = supabase as unknown as CommentsClient,
): Promise<Comment> {
  const payload = {
    doc_id: input.docId,
    thread_id: input.threadId,
    parent_id: input.parentId ?? null,
    author_id: input.authorId,
    author_name: input.authorName,
    body: input.body,
    anchor: input.anchor ?? null,
  }

  const { data, error } = await client
    .from('comments')
    .insert(payload)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create comment')
  }
  return mapRow(data as CommentRow)
}

export async function updateComment(
  id: string,
  props: Partial<Pick<Comment, 'body' | 'resolved'>>,
  client: CommentsClient = supabase as unknown as CommentsClient,
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (props.body !== undefined) payload.body = props.body
  if (props.resolved !== undefined) payload.resolved = props.resolved

  const { error } = await client.from('comments').update(payload).eq('id', id)

  if (error) {
    throw new Error(error.message || 'Failed to update comment')
  }
}

export async function deleteComment(
  id: string,
  client: CommentsClient = supabase as unknown as CommentsClient,
): Promise<void> {
  const { error } = await client.from('comments').delete().eq('id', id)

  if (error) {
    throw new Error(error.message || 'Failed to delete comment')
  }
}
