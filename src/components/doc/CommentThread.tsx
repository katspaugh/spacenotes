import { useRef, useState } from 'react'
import type { CommentThread } from '../../types/comment.js'
import { sanitizeHtml } from '../../lib/sanitize-html.js'
import { avatarColor, initials, relativeTime } from '../../lib/comment-format.js'

export type CommentThreadProps = {
  thread: CommentThread
  canReply: boolean
  canResolve: boolean
  active?: boolean
  onReply: (body: string) => void
  onResolve: (resolved: boolean) => void
  onFocus?: () => void
}

function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const bg = avatarColor(name)
  const abbr = initials(name)
  return (
    <span
      className="CommentThread_avatar"
      style={{ width: size, height: size, background: bg }}
      aria-label={name}
    >
      {abbr}
    </span>
  )
}

export function CommentThreadCard({
  thread,
  canReply,
  canResolve,
  active = false,
  onReply,
  onResolve,
  onFocus,
}: CommentThreadProps) {
  const [replyText, setReplyText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { root, replies, resolved, outdated } = thread

  const classNames = [
    'CommentThread',
    active ? 'is-active' : '',
    resolved ? 'is-resolved' : '',
  ]
    .filter(Boolean)
    .join(' ')

  function handleReplyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && replyText.trim()) {
      onReply(replyText.trim())
      setReplyText('')
    }
  }

  return (
    <article
      className={classNames}
      data-thread-id={root.threadId}
    >
      {/* Card header */}
      <div className="CommentThread_header">
        <Avatar name={root.authorName} size={26} />
        <span className="CommentThread_author">{root.authorName}</span>
        {resolved && <span className="CommentThread_badge">RESOLVED</span>}
        <span className="CommentThread_time" data-testid="comment-time">
          {relativeTime(root.createdAt)}
        </span>
      </div>

      {/* Outdated warning */}
      {outdated && (
        <p className="CommentThread_outdated">⚠ content changed</p>
      )}

      {/* Root comment body — clicks forward to onFocus */}
      <div
        className="CommentThread_body"
        data-testid="comment-body"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(root.body) }}
        onClick={onFocus}
      />

      {/* Flat replies — authorName rendered as escaped JSX text, body sanitized */}
      {replies.map((reply) => (
        <div key={reply.id} className="CommentThread_reply">
          <Avatar name={reply.authorName} size={22} />
          <span className="CommentThread_replyText">
            <b>{reply.authorName}</b>{' '}
            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(reply.body) }} />
          </span>
        </div>
      ))}

      {/* Reply input */}
      {canReply && (
        <div className="CommentThread_replyInput">
          <input
            ref={inputRef}
            type="text"
            placeholder="Reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleReplyKeyDown}
            aria-label="Write a reply"
          />
        </div>
      )}

      {/* Resolve / Unresolve */}
      {canResolve && (
        <div className="CommentThread_resolveRow">
          <button
            type="button"
            className="CommentThread_resolveBtn"
            onClick={() => onResolve(!resolved)}
          >
            {resolved ? 'Unresolve' : 'Resolve'}
          </button>
        </div>
      )}
    </article>
  )
}
