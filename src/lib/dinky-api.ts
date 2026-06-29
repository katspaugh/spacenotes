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

type FluentQuery = {
  select: (columns: string, options?: { count?: 'exact' }) => FluentQuery
  eq: (...args: unknown[]) => FluentQuery
  order: (...args: unknown[]) => FluentQuery
  range: (from: number, to: number) => Promise<{ data?: unknown; count?: number | null; error?: { message?: string; code?: string } | null }>
  maybeSingle: () => Promise<{ data?: unknown; error?: { message?: string; code?: string } | null }>
  upsert: (payload: unknown) => Promise<{ error: { message?: string; code?: string } | null }>
  delete?: () => FluentQuery
}

export type DocumentsClient = {
  from: (table: 'documents') => FluentQuery
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

export async function loadDoc(id: string, client: DocumentsClient = supabase as unknown as DocumentsClient): Promise<DinkyDataV2> {
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

export async function saveDoc(data: DinkyDataV2, userId: string, client: DocumentsClient = supabase as unknown as DocumentsClient): Promise<{ status: number; key: string }> {
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

export async function listDocsPage(userId: string, page = 1, perPage = 12, client: DocumentsClient = supabase as unknown as DocumentsClient): Promise<{ spaces: SpaceMeta[]; total: number }> {
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

  const spaces = (data as DocumentRow[]).map((row: DocumentRow) => {
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
