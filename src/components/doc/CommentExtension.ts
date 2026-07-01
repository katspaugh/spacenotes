/**
 * CommentExtension — Task 7
 *
 * Provides:
 *  - `buildDecorations(doc, threads)` — pure builder: inline highlight over
 *    [from, to] + numbered widget badge at `to` for each rendered thread.
 *  - `commentPluginKey` — ProseMirror PluginKey for the comment state.
 *  - `CommentDecorations` — TipTap Extension that hosts the plugin and maps
 *    decorations through transactions so highlights follow edits.
 *  - `setCommentThreads(editor, threads)` — push a new thread list via setMeta.
 *  - `highlightClass(resolved)` / `badgeClass(resolved)` — pure helpers (exported
 *    for direct unit testing without inspecting decoration internals).
 *
 * The document JSON is NEVER mutated — decorations only.
 */

import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { CommentThread } from '../../types/comment.js'

// ---------------------------------------------------------------------------
// Pure class helpers (exported for direct unit testing)
// ---------------------------------------------------------------------------

export function highlightClass(resolved: boolean): string {
  return resolved ? 'cmt-highlight cmt-highlight--resolved' : 'cmt-highlight'
}

export function badgeClass(resolved: boolean): string {
  return resolved ? 'cmt-badge cmt-badge--resolved' : 'cmt-badge'
}

// ---------------------------------------------------------------------------
// buildDecorations
// ---------------------------------------------------------------------------

/**
 * Build a ProseMirror DecorationSet from the current comment threads.
 *
 * For each thread (in array order) that has a non-null root.anchor and is not
 * outdated:
 *   - Inline decoration over [from, to] (positions clamped to [0, doc.content.size]).
 *   - Widget decoration (numbered badge) at `to` with side:1.
 *
 * Threads with outdated=true or anchor=null produce NO decorations.
 * Threads whose from >= to after clamping are silently skipped.
 * Badge numbers are 1-based over the rendered (non-skipped) threads only.
 */
export function buildDecorations(doc: PMNode, threads: CommentThread[]): DecorationSet {
  const size = doc.content.size
  const decorations: Decoration[] = []
  let badgeNumber = 0

  for (const thread of threads) {
    const anchor = thread.root.anchor
    if (!anchor) continue
    if (thread.outdated) continue

    const from = Math.max(0, Math.min(anchor.from, size))
    const to = Math.max(0, Math.min(anchor.to, size))
    if (from >= to) continue

    badgeNumber++
    const num = badgeNumber
    const { resolved } = thread
    const threadId = thread.root.threadId

    decorations.push(
      Decoration.inline(from, to, {
        class: highlightClass(resolved),
        'data-thread-id': threadId,
      }),
    )

    decorations.push(
      Decoration.widget(
        to,
        () => {
          const el = document.createElement('span')
          el.className = badgeClass(resolved)
          el.textContent = String(num)
          el.setAttribute('data-thread-id', threadId)
          return el
        },
        { side: 1 },
      ),
    )
  }

  if (decorations.length === 0) return DecorationSet.empty

  // DecorationSet.create expects decorations sorted by ascending from position.
  decorations.sort((a, b) => a.from - b.from || a.to - b.to)

  return DecorationSet.create(doc, decorations)
}

// ---------------------------------------------------------------------------
// Plugin key
// ---------------------------------------------------------------------------

export const commentPluginKey = new PluginKey<DecorationSet>('comments')

// ---------------------------------------------------------------------------
// TipTap Extension
// ---------------------------------------------------------------------------

/**
 * CommentDecorations TipTap extension.
 *
 * Hosts a ProseMirror plugin whose state is a DecorationSet.
 * Threads are injected via `setCommentThreads(editor, threads)`.
 * When a transaction arrives WITHOUT thread meta, the plugin maps the existing
 * DecorationSet through the transaction's mapping so highlights follow edits.
 */
export const CommentDecorations = Extension.create({
  name: 'commentDecorations',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: commentPluginKey,

        state: {
          init: () => DecorationSet.empty,

          apply(tr, oldSet) {
            const meta = tr.getMeta(commentPluginKey) as { threads: CommentThread[] } | undefined
            if (meta && meta.threads) {
              return buildDecorations(tr.doc, meta.threads)
            }
            // Map decorations through the transaction so positions stay correct.
            return oldSet.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return this.getState(state) ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})

// ---------------------------------------------------------------------------
// Public helper — push a new thread list into the editor
// ---------------------------------------------------------------------------

/**
 * Push a new set of comment threads into the decoration plugin.
 * Triggers a re-render of highlights and badges in the editor.
 * Call this whenever the threads list changes (initial load, new comment, etc.).
 */
export function setCommentThreads(editor: Editor, threads: CommentThread[]): void {
  const { state, view } = editor
  view.dispatch(state.tr.setMeta(commentPluginKey, { threads }))
}
