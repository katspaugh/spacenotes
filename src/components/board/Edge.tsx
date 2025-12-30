import { useCallback, useMemo } from 'react'
import type { CanvasNode } from '../../types/canvas.js'
import { INITIAL_HEIGHT, INITIAL_WIDTH } from './Editable.js'

type EdgeProps = {
  fromNode: string
  toNode: string
  nodes: CanvasNode[]
  onDisconnect: (from: string, to: string) => void
  toPosition?: { x: number; y: number }
  color?: string
}

const MIN_D = 30

function getPath(from: CanvasNode, to: CanvasNode): {
  x1: number
  y1: number
  x2: number
  y2: number
  cp1x: number
  cp1y: number
  cp2x: number
  cp2y: number
} {
  const fromWidth = from.width || INITIAL_WIDTH
  const fromHeight = from.height || INITIAL_HEIGHT
  const toWidth = to.width || INITIAL_WIDTH
  const toHeight = to.height || INITIAL_HEIGHT

  let x1: number, y1: number, x2: number, y2: number
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number

  // Calculate center points
  const fromCenterX = from.x + fromWidth / 2
  const fromCenterY = from.y + fromHeight / 2
  const toCenterX = to.x + toWidth / 2
  const toCenterY = to.y + toHeight / 2

  // Calculate distance between nodes
  const dx = toCenterX - fromCenterX
  const dy = toCenterY - fromCenterY
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Adaptive curve strength based on distance (min 50, max 200)
  const curveStrength = Math.min(Math.max(distance * 0.4, 50), 200)

  // Determine primary direction and connection points
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  // Check if nodes are primarily vertically aligned
  if (absY > absX && absY > MIN_D) {
    // Vertical connection
    if (dy > 0) {
      // Target is below source
      x1 = fromCenterX
      y1 = from.y + fromHeight
      x2 = toCenterX
      y2 = to.y

      // Control points create a smooth S-curve
      cp1x = x1
      cp1y = y1 + curveStrength
      cp2x = x2
      cp2y = y2 - curveStrength
    } else {
      // Target is above source
      x1 = fromCenterX
      y1 = from.y
      x2 = toCenterX
      y2 = to.y + toHeight

      cp1x = x1
      cp1y = y1 - curveStrength
      cp2x = x2
      cp2y = y2 + curveStrength
    }
  } else {
    // Horizontal connection
    if (dx > 0) {
      // Target is to the right
      x1 = from.x + fromWidth
      y1 = fromCenterY
      x2 = to.x
      y2 = toCenterY

      // For horizontal connections, use adaptive control points
      const horizontalCurve = Math.min(curveStrength, Math.abs(dx) / 2)
      cp1x = x1 + horizontalCurve
      cp1y = y1
      cp2x = x2 - horizontalCurve
      cp2y = y2
    } else {
      // Target is to the left
      x1 = from.x
      y1 = fromCenterY
      x2 = to.x + toWidth
      y2 = toCenterY

      const horizontalCurve = Math.min(curveStrength, Math.abs(dx) / 2)
      cp1x = x1 - horizontalCurve
      cp1y = y1
      cp2x = x2 + horizontalCurve
      cp2y = y2
    }
  }

  return { x1, y1, x2, y2, cp1x, cp1y, cp2x, cp2y }
}

export const Edge = ({ fromNode, toNode, nodes, onDisconnect, toPosition, color }: EdgeProps) => {
  const from = useMemo(() => nodes.find((node) => node.id === fromNode), [fromNode, nodes])!
  const to = useMemo(() => nodes.find((node) => node.id === toNode), [toNode, nodes])!

  const onClick = useCallback(() => {
    onDisconnect(fromNode, toNode)
  }, [fromNode, toNode, onDisconnect])

  if (!from || !to) {
    console.warn(`Edge from "${fromNode}" to "${toNode}" not found in nodes`, { from, to, nodes })
    return null
  }

  let x1: number, y1: number, x2: number, y2: number
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number

  if (toPosition) {
    // Temporary connector while dragging
    const fromWidth = from.width || INITIAL_WIDTH
    const fromHeight = from.height || INITIAL_HEIGHT
    const fromCenterX = from.x + fromWidth / 2
    const fromCenterY = from.y + fromHeight / 2

    // Determine which side to connect from based on mouse position
    const dx = toPosition.x - fromCenterX
    const dy = toPosition.y - fromCenterY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (absY > absX && absY > 30) {
      // Vertical connection
      if (dy > 0) {
        // Mouse is below
        x1 = fromCenterX
        y1 = from.y + fromHeight
      } else {
        // Mouse is above
        x1 = fromCenterX
        y1 = from.y
      }
    } else {
      // Horizontal connection
      if (dx > 0) {
        // Mouse is to the right
        x1 = from.x + fromWidth
        y1 = fromCenterY
      } else {
        // Mouse is to the left
        x1 = from.x
        y1 = fromCenterY
      }
    }

    x2 = toPosition.x
    y2 = toPosition.y

    // Calculate adaptive curve for temporary connector
    const distance = Math.sqrt(dx * dx + dy * dy)
    const curveStrength = Math.min(Math.max(distance * 0.4, 50), 200)

    // Adjust control points based on direction
    if (absY > absX) {
      // Vertical
      cp1x = x1
      cp1y = dy > 0 ? y1 + curveStrength : y1 - curveStrength
      cp2x = x2
      cp2y = dy > 0 ? y2 - curveStrength : y2 + curveStrength
    } else {
      // Horizontal
      cp1x = dx > 0 ? x1 + curveStrength : x1 - curveStrength
      cp1y = y1
      cp2x = dx > 0 ? x2 - curveStrength : x2 + curveStrength
      cp2y = y2
    }
  } else {
    const path = getPath(from, to)
    x1 = path.x1
    y1 = path.y1
    x2 = path.x2
    y2 = path.y2
    cp1x = path.cp1x
    cp1y = path.cp1y
    cp2x = path.cp2x
    cp2y = path.cp2y
  }

  return (
    <g className="Edge" style={color ? { '--edge-color': color } as React.CSSProperties : undefined}>
      <path
        d={`M ${x1} ${y1} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2}`}
        onClick={onClick}
        style={color ? { stroke: color } : undefined}
      />
      <circle cx={x1} cy={y1} r="4" style={color ? { fill: color } : undefined} />
      <circle cx={x2} cy={y2} r="4" style={color ? { fill: color } : undefined} />
    </g>
  )
}
