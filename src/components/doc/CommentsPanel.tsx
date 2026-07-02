import { useState } from 'react'
import type { CommentThread } from '../../types/comment.js'
import { CommentThreadCard } from './CommentThread.js'

type Tab = 'open' | 'resolved'

export type CommentsPanelProps = {
  openThreads: CommentThread[]
  resolvedThreads: CommentThread[]
  canComment: boolean
  onSignIn: () => void
  activeThreadId?: string
  canReply: boolean
  canResolve: (thread: CommentThread) => boolean
  onReply: (threadId: string, body: string) => void
  onResolve: (threadId: string, resolved: boolean) => void
  onFocusThread?: (threadId: string) => void
}

export function CommentsPanel({
  openThreads,
  resolvedThreads,
  canComment,
  onSignIn,
  activeThreadId,
  canReply,
  canResolve,
  onReply,
  onResolve,
  onFocusThread,
}: CommentsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('open')

  const visibleThreads = activeTab === 'open' ? openThreads : resolvedThreads

  return (
    <aside className="CommentsPanel">
      {/* Header row */}
      <div className="CommentsPanel_header">
        <span className="CommentsPanel_title">Comments</span>
        <div className="CommentsPanel_tabs">
          <button
            type="button"
            className={`CommentsPanel_tab${activeTab === 'open' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('open')}
          >
            {`Open · ${openThreads.length}`}
          </button>
          <button
            type="button"
            className={`CommentsPanel_tab${activeTab === 'resolved' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('resolved')}
          >
            {`Resolved · ${resolvedThreads.length}`}
          </button>
        </div>
      </div>

      {/* Sign-in nudge for anonymous viewers */}
      {!canComment && (
        <div className="CommentsPanel_signin">
          <button type="button" onClick={onSignIn}>
            Sign in to comment
          </button>
        </div>
      )}

      {/* Thread list */}
      <div className="CommentsPanel_threads">
        {visibleThreads.length === 0 ? (
          <p className="CommentsPanel_empty">
            {activeTab === 'open' ? 'No open comments' : 'No resolved comments'}
          </p>
        ) : (
          visibleThreads.map((thread) => (
            <CommentThreadCard
              key={thread.root.threadId}
              thread={thread}
              canReply={canReply}
              canResolve={canResolve(thread)}
              active={thread.root.threadId === activeThreadId}
              onReply={(body) => onReply(thread.root.threadId, body)}
              onResolve={(resolved) => onResolve(thread.root.threadId, resolved)}
              onFocus={onFocusThread ? () => onFocusThread(thread.root.threadId) : undefined}
            />
          ))
        )}
      </div>
    </aside>
  )
}
