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
