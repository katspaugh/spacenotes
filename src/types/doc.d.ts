export type TipTapJSON = {
  type?: string
  attrs?: Record<string, unknown>
  content?: TipTapJSON[]
  text?: string
  marks?: Array<{
    type: string
    attrs?: Record<string, unknown>
  }>
  [key: string]: unknown
}

export type TextDocData = {
  id: string
  schemaVersion: 2
  kind: 'doc'
  title?: string
  userId?: string
  content: TipTapJSON
}
