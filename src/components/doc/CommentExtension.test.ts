/**
 * Unit tests for buildDecorations (CommentExtension, Task 7).
 *
 * Document: single paragraph "The quick brown fox" (19 chars).
 * ProseMirror positions inside the paragraph:
 *   pos 1 = before "T", pos 5 = before "q" (start of "quick"),
 *   pos 10 = after "k" (end of "quick"), pos 20 = end of paragraph text.
 *   doc.content.size = 21 (1 paragraph-open + 19 chars + 1 paragraph-close).
 *
 * We build the PM doc directly from the schema (via getSchema + nodeFromJSON)
 * so we do NOT need a full TipTap Editor or React in this unit test.
 */
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Decoration } from '@tiptap/pm/view'
import { beforeAll, describe, expect, it } from 'vitest'
import type { CommentThread } from '../../types/comment.js'
import { buildDecorations, highlightClass, badgeClass } from './CommentExtension.js'

// ---------------------------------------------------------------------------
// Build a real ProseMirror doc without a full Editor instance
// ---------------------------------------------------------------------------

let doc: PMNode

beforeAll(() => {
  const schema = getSchema([StarterKit])
  doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'The quick brown fox' }],
      },
    ],
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeThread(overrides: {
  from: number
  to: number
  resolved?: boolean
  outdated?: boolean
  threadId?: string
}): CommentThread {
  const { from, to, resolved = false, outdated = false, threadId = 'thread-1' } = overrides
  return {
    root: {
      id: `root-${threadId}`,
      docId: 'doc-1',
      threadId,
      parentId: null,
      authorId: 'author-1',
      authorName: 'Alice',
      body: 'A comment',
      anchor: { from, to, quote: 'text' },
      resolved,
      createdAt: '2026-01-01T00:00:00Z',
    },
    replies: [],
    resolved,
    outdated,
  }
}

function makeOutdatedThread(): CommentThread {
  return {
    root: {
      id: 'root-outdated',
      docId: 'doc-1',
      threadId: 'thread-outdated',
      parentId: null,
      authorId: 'author-1',
      authorName: 'Alice',
      body: 'A comment',
      anchor: { from: 5, to: 10, quote: 'changed text' },
      resolved: false,
      createdAt: '2026-01-01T00:00:00Z',
    },
    replies: [],
    resolved: false,
    outdated: true,
  }
}

function makeNullAnchorThread(): CommentThread {
  return {
    root: {
      id: 'root-null',
      docId: 'doc-1',
      threadId: 'thread-null',
      parentId: null,
      authorId: 'author-1',
      authorName: 'Alice',
      body: 'A comment',
      anchor: null,
      resolved: false,
      createdAt: '2026-01-01T00:00:00Z',
    },
    replies: [],
    resolved: false,
    outdated: false,
  }
}

// ---------------------------------------------------------------------------
// Pure helper tests — no decoration internals needed
// ---------------------------------------------------------------------------

describe('highlightClass', () => {
  it('returns cmt-highlight for non-resolved', () => {
    expect(highlightClass(false)).toBe('cmt-highlight')
  })

  it('returns cmt-highlight cmt-highlight--resolved for resolved', () => {
    expect(highlightClass(true)).toBe('cmt-highlight cmt-highlight--resolved')
  })
})

describe('badgeClass', () => {
  it('returns cmt-badge for non-resolved', () => {
    expect(badgeClass(false)).toBe('cmt-badge')
  })

  it('returns cmt-badge cmt-badge--resolved for resolved', () => {
    expect(badgeClass(true)).toBe('cmt-badge cmt-badge--resolved')
  })
})

// ---------------------------------------------------------------------------
// buildDecorations
// ---------------------------------------------------------------------------

describe('buildDecorations', () => {
  it('returns an empty DecorationSet for an empty threads array', () => {
    const set = buildDecorations(doc, [])
    expect(set.find()).toHaveLength(0)
  })

  it('creates exactly 2 decorations (1 inline + 1 widget) for a single anchored non-resolved thread', () => {
    // "quick" in "The quick brown fox":
    //   paragraph open = pos 0 (before paragraph), text starts at pos 1
    //   "The " = 4 chars → "quick" starts at pos 5, ends at pos 10
    const thread = makeThread({ from: 5, to: 10 })
    const set = buildDecorations(doc, [thread])
    expect(set.find()).toHaveLength(2)
  })

  it('inline decoration spans the anchor [from, to]', () => {
    const thread = makeThread({ from: 5, to: 10 })
    const set = buildDecorations(doc, [thread])
    const decos = set.find()
    // The inline decoration has from < to; the widget has from === to
    const inline = decos.find((d: Decoration) => d.from === 5 && d.to === 10)
    expect(inline).toBeDefined()
  })

  it('widget decoration sits at `to` (from === to === anchor.to)', () => {
    const thread = makeThread({ from: 5, to: 10 })
    const set = buildDecorations(doc, [thread])
    const decos = set.find()
    const widget = decos.find((d: Decoration) => d.from === 10 && d.to === 10)
    expect(widget).toBeDefined()
  })

  it('inline decoration carries the cmt-highlight class (via type.attrs)', () => {
    const thread = makeThread({ from: 5, to: 10, resolved: false })
    const set = buildDecorations(doc, [thread])
    const decos = set.find()
    const inline = decos.find((d: Decoration) => d.from < d.to)
    // access internal attrs — cast to any since InlineType.attrs is @internal in PM
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls: string = (inline as any)?.type?.attrs?.class ?? ''
    expect(cls).toBe('cmt-highlight')
  })

  it('resolved thread inline decoration carries cmt-highlight--resolved class', () => {
    const thread = makeThread({ from: 5, to: 10, resolved: true })
    const set = buildDecorations(doc, [thread])
    const decos = set.find()
    const inline = decos.find((d: Decoration) => d.from < d.to)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls: string = (inline as any)?.type?.attrs?.class ?? ''
    expect(cls).toBe('cmt-highlight cmt-highlight--resolved')
  })

  it('resolved thread still produces 2 decorations', () => {
    const thread = makeThread({ from: 5, to: 10, resolved: true })
    const set = buildDecorations(doc, [thread])
    expect(set.find()).toHaveLength(2)
  })

  it('outdated thread produces NO decorations', () => {
    const set = buildDecorations(doc, [makeOutdatedThread()])
    expect(set.find()).toHaveLength(0)
  })

  it('null-anchor thread produces NO decorations', () => {
    const set = buildDecorations(doc, [makeNullAnchorThread()])
    expect(set.find()).toHaveLength(0)
  })

  it('skips outdated / null-anchor threads while still rendering valid ones', () => {
    const threads = [
      makeOutdatedThread(),
      makeNullAnchorThread(),
      makeThread({ from: 5, to: 10, threadId: 'thread-a' }),
    ]
    const set = buildDecorations(doc, threads)
    // Only the third thread renders → 2 decorations
    expect(set.find()).toHaveLength(2)
  })

  it('badge numbering is 1-based over rendered threads (skipped threads do not consume numbers)', () => {
    const threads = [
      makeNullAnchorThread(),                                      // skipped
      makeThread({ from: 1, to: 4, threadId: 'th-1' }),           // "The"  → badge "1"
      makeOutdatedThread(),                                        // skipped
      makeThread({ from: 5, to: 10, threadId: 'th-2' }),          // "quick" → badge "2"
    ]
    const set = buildDecorations(doc, threads)
    // Two valid threads → 4 decorations (2 inline + 2 widget)
    expect(set.find()).toHaveLength(4)

    // Render each widget's DOM (the factory ignores its args) and read the
    // badge number, keyed by the widget's position (to of each anchor).
    const widgets = set.find().filter((d: Decoration) => d.from === d.to)
    const badgeAt = (pos: number): string => {
      const w = widgets.find((d: Decoration) => d.from === pos)
      // WidgetType.toDOM is the factory function we passed to Decoration.widget
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const el = (w as any).type.toDOM as HTMLElement | (() => HTMLElement)
      const node = typeof el === 'function' ? el() : el
      return node.textContent ?? ''
    }

    expect(badgeAt(4)).toBe('1')   // th-1 (renders first)
    expect(badgeAt(10)).toBe('2')  // th-2 (renders second; skipped threads don't count)
  })

  it('two rendered threads produce 2 widget decorations (at their respective to positions)', () => {
    const threads = [
      makeThread({ from: 1, to: 4, threadId: 'th-1' }),
      makeThread({ from: 5, to: 10, threadId: 'th-2' }),
    ]
    const set = buildDecorations(doc, threads)
    const decos = set.find()
    const widgets = decos.filter((d: Decoration) => d.from === d.to)
    expect(widgets).toHaveLength(2)
    // Each widget sits at `to` of its respective anchor
    expect(widgets.some((w: Decoration) => w.from === 4)).toBe(true)
    expect(widgets.some((w: Decoration) => w.from === 10)).toBe(true)
  })

  it('out-of-range anchors (entirely beyond doc) are skipped without throwing', () => {
    const docSize = doc.content.size
    const wayOff = makeThread({ from: docSize + 100, to: docSize + 200, threadId: 'off' })
    expect(() => buildDecorations(doc, [wayOff])).not.toThrow()
    expect(buildDecorations(doc, [wayOff]).find()).toHaveLength(0)
  })

  it('partially out-of-range anchor is clamped — renders if from < clamped-to', () => {
    const docSize = doc.content.size  // 21
    // from=5 is valid; to clamped to 21; 5 < 21 → produces 2 decorations
    const partiallyOff = makeThread({ from: 5, to: docSize + 50, threadId: 'partial' })
    expect(() => buildDecorations(doc, [partiallyOff])).not.toThrow()
    expect(buildDecorations(doc, [partiallyOff]).find()).toHaveLength(2)
  })

  it('from === to anchor is skipped without throwing', () => {
    const equal = makeThread({ from: 5, to: 5, threadId: 'equal' })
    expect(() => buildDecorations(doc, [equal])).not.toThrow()
    expect(buildDecorations(doc, [equal]).find()).toHaveLength(0)
  })
})
