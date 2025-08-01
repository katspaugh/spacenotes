import { useCallback, useMemo } from 'react'
import type { CanvasNode } from '../../types/canvas.js'
import { INITIAL_HEIGHT, INITIAL_WIDTH } from './Editable.js'

type EdgeProps = {
  fromNode: string
  toNode: string
  nodes: CanvasNode[]
  onDisconnect: (from: string, to: string) => void
  toPosition?: { x: number; y: number }
}

const MIN_D = 30
const CURVE = 50

function getPath(from: CanvasNode, to: CanvasNode): { x1: number; y1: number; x2: number; y2: number; curve: number } {
  let x1, y1, x2, y2, curve

  if (from.x < to.x) {
    x1 = from.x + (from.width || INITIAL_WIDTH)
    y1 = from.y + (from.height || INITIAL_HEIGHT) / 2
    x2 = to.x
    y2 = to.y + (to.height || INITIAL_HEIGHT) / 2
    curve = CURVE
  } else {
    x1 = from.x
    y1 = from.y + (from.height || INITIAL_HEIGHT) / 2
    x2 = to.x + (to.width || INITIAL_WIDTH)
    y2 = to.y + (to.height || INITIAL_HEIGHT) / 2
    curve = -CURVE
  }

    if (to.y > (from.y + (from.height || INITIAL_HEIGHT) + MIN_D)) {
      x1 = from.x + (from.width || INITIAL_WIDTH) / 2
      y1 = from.y + (from.height || INITIAL_HEIGHT)
      x2 = to.x + (to.width || INITIAL_WIDTH) / 2
      y2 = to.y
      curve = CURVE
    } else if (from.y > (to.y + (to.height || INITIAL_HEIGHT) + MIN_D) ) {
      x1 = from.x + (from.width || INITIAL_WIDTH) / 2
      y1 = from.y
      x2 = to.x + (to.width || INITIAL_WIDTH) / 2
      y2 = to.y + (to.height || INITIAL_HEIGHT)
      curve = -CURVE
    }

  return { x1, y1, x2, y2, curve }
}

export const Edge = ({ fromNode, toNode, nodes, onDisconnect, toPosition }: EdgeProps) => {
  const from = useMemo(() => nodes.find((node) => node.id === fromNode), [fromNode, nodes])!
  const to = useMemo(() => nodes.find((node) => node.id === toNode), [toNode, nodes])!

  const onClick = useCallback(() => {
    onDisconnect(fromNode, toNode)
  }, [fromNode, toNode, onDisconnect])

  if (!from || !to) {
    console.warn(`Edge from "${fromNode}" to "${toNode}" not found in nodes`, { from, to, nodes })
    return null
  }

  // The edges must always start in the middle of the closes side of the node
  // If the nodes are one on top of the other, the edge must be vertical
  // If the nodes are one next to the other, the edge must be horizontal
  let x1, y1, x2, y2, curve

  if (toPosition) {
    x1 = from.x + (from.width || INITIAL_WIDTH)
    y1 = from.y + (from.height || INITIAL_HEIGHT) / 2
    x2 = toPosition.x
    y2 = toPosition.y
    curve = CURVE
  } else {
    const path = getPath(from, to)
    x1 = path.x1
    y1 = path.y1
    x2 = path.x2
    y2 = path.y2
    curve = path.curve
  }

  return (
    <g className="Edge">
      <path
        d={`M ${x1} ${y1} C ${x1 + curve} ${y1} ${x2 - curve} ${y2} ${x2} ${y2}`}
        onClick={onClick}
      />
      <circle cx={x1} cy={y1} r="4" />
      <circle cx={x2} cy={y2} r="4" />
    </g>
  )
}
