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

export type CommentThread = {
  root: Comment
  replies: Comment[]
  resolved: boolean
  outdated: boolean
}
