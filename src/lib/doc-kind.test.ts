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
