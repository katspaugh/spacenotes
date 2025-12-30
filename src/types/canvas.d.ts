// https://jsoncanvas.org/spec/1.0/

export type CanvasNode = {
  id: string
  type: string
  x: number
  y: number
  width?: number
  height?: number
  color?: string
  content?: string
}

export type CanvasEdge = {
  id: string
  fromNode: string
  toNode: string
  color?: string
}

export type CanvasProps = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}
