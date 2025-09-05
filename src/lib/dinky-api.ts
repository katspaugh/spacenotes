import type { CanvasProps } from '../types/canvas.js'
import { stripHtml } from './sanitize-html.js'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js'

export type DinkyDataV2 = CanvasProps & {
  id: string
  lastSequence: number
  title?: string
  backgroundColor?: string
  version: 2
  userId?: string
}

export async function loadDoc(id: string): Promise<DinkyDataV2> {
  const { data: row, error } = await supabase
    .from('documents')
    .select('data, user_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !row) {
    throw new Error(error?.message || 'Document not found')
  }
  const data = JSON.parse(row.data)

  return { ...data, userId: row.user_id }
}

export async function saveDoc(data: DinkyDataV2, userId: string): Promise<{ status: number; key: string }> {
  const encData = JSON.stringify(data)
  const { error } = await supabase
    .from('documents')
    .upsert({ id: data.id, data: encData, user_id: userId })

  if (error) {
    throw error
  }
  return { status: 200, key: data.id }
}

export function saveDocBeacon(data: DinkyDataV2, accessToken: string, userId: string): void {
  const url = `${SUPABASE_URL}/rest/v1/documents?on_conflict=id`
  const encData = JSON.stringify(data)
  const body = JSON.stringify({ id: data.id, data: encData, user_id: userId })
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
export type SpaceMeta = { id: string; title?: string, backgroundColor?: string }

export async function listDocsPage(userId: string, page = 1, perPage = 12): Promise<{ spaces: SpaceMeta[]; total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  const { data, count, error } = await supabase
    .from('documents')
    .select('id, data, updated_at, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error || !data) {
    throw error || new Error('Unable to load documents')
  }
  const spaces = data.map((row: { id: string; data: string }) => {
    try {
      const parsed = JSON.parse(row.data)
      return {
        id: row.id,
        title: parsed.title || stripHtml(parsed.nodes[0]?.content || ''),
        backgroundColor: parsed.backgroundColor,
      } as SpaceMeta
    } catch {
      return { id: row.id } as SpaceMeta
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
