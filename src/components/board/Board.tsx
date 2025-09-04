import { useCallback, useMemo, useRef, useState, useEffect, type CSSProperties } from 'react'
import type { CanvasEdge, CanvasNode } from '../../types/canvas'
import { DraggableNode } from './DraggableNode.js'
import { Edge } from './Edge.js'
import { useMousePosition } from '../../hooks/useMousePosition.js'
import { useOnKey } from '../../hooks/useOnKey.js'
import { SelectionBox } from './SelectionBox.js'
import { INITIAL_HEIGHT, INITIAL_WIDTH } from './Editable.js'
import { ColorPicker } from '../ColorPicker.js'

type BoardProps = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  backgroundColor?: string
  isLocked?: boolean
  onNodeCreate: (node: Partial<CanvasNode>) => CanvasNode
  onNodeDelete: (id: string) => void
  onNodeUpdate: (id: string, props: Partial<CanvasNode>) => void
  onConnect: (from: string, to: string) => void
  onDisconnect: (from: string, to: string) => void
  onBackgroundColorChange: (color: string) => void
  cursors: Record<string, { x: number; y: number; color: string }>
  clientId: string
  onCursorMove: (x: number, y: number) => void
  selections: Record<string, string[]>
  onSelectNodes: (ids: string[]) => void
}

const WIDTH = 5000
const HEIGHT = 5000

export function Board(props: BoardProps) {
  const tempFrom = useRef<string | null>(null)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const mousePosition = useMousePosition()

  const updateSelection = useCallback(
    (ids: string[]) => {
      setSelectedNodes(ids)
      props.onSelectNodes(ids)
    },
    [props.onSelectNodes],
  )

  const remoteSelectionColor = useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(props.selections).forEach(([client, ids]) => {
      const color = props.cursors[client]?.color
      if (color) ids.forEach((id) => {
        if (!map[id]) map[id] = color
      })
    })
    return map
  }, [props.selections, props.cursors])

  useEffect(() => {
    props.onCursorMove(mousePosition.x, mousePosition.y)
  }, [mousePosition.x, mousePosition.y, props.onCursorMove])

  const onBackgroundColorChange = useCallback((color: string) => {
    props.onBackgroundColorChange(color)
  }, [props.onBackgroundColorChange])

  const onNodeClick = useCallback(
    (id: string) => {
      if (tempFrom.current) {
        if (tempFrom.current !== id) {
          props.onConnect(tempFrom.current, id)
        }
        tempFrom.current = null
      } else {
        updateSelection([id])
      }
    },
    [props.onConnect, updateSelection],
  )

  const onNodeCreate = useCallback((nodeProps?: Partial<CanvasNode>) => {
    const node = props.onNodeCreate({
      x: mousePosition.x - 10,
      y: mousePosition.y - 10,
      ...nodeProps,
    })
    return node
  }, [props.onNodeCreate, mousePosition.x, mousePosition.y])

  const onBoardClick = useCallback(() => {
    updateSelection([])

    if (tempFrom.current) {
      const node = onNodeCreate()
      props.onConnect(tempFrom.current, node.id)
      tempFrom.current = null
    }
  }, [onNodeCreate, props.onConnect])

  const onBoardDblClick = useCallback(() => {
    const node = onNodeCreate()
    updateSelection([node.id])
  }, [onNodeCreate])

  const onNodeUpdate = useCallback((id: string, item: Partial<CanvasNode>) => {
    if ((item.x !== undefined || item.y !== undefined) && selectedNodes.length > 1) {
      const node = props.nodes.find((node) => node.id === id)
      const dx = item.x - node.x
      const dy = item.y - node.y

      selectedNodes.forEach((nodeId) => {
        const node = props.nodes.find((node) => node.id === nodeId)
        props.onNodeUpdate(nodeId, { x: Math.round(node.x + dx), y: Math.round(node.y + dy) })
      })
      return
    }
    props.onNodeUpdate(id, item)
  }, [props.nodes, props.onNodeUpdate, selectedNodes])

  const onConnectStart = useCallback((id: string) => {
    tempFrom.current = id
  }, [])

  const renderNode = useCallback(
    (node: CanvasNode) => {
      return (
        <DraggableNode
          {...node}
          key={node.id}
          onNodeUpdate={onNodeUpdate}
          onConnectStart={onConnectStart}
          onClick={onNodeClick}
          selected={selectedNodes.includes(node.id)}
          selectedByColor={remoteSelectionColor[node.id]}
        />
      )
    },
    [onNodeUpdate, selectedNodes, onConnectStart, onNodeClick, remoteSelectionColor],
  )

  const renderEdge = useCallback(
    (edge: CanvasEdge, _, __, toPosition?: { x: number; y: number }) => {
      return (
        <Edge
          key={edge.id || edge.fromNode + edge.toNode}
          {...edge}
          nodes={props.nodes}
          onDisconnect={props.onDisconnect}
          toPosition={toPosition}
        />
      )
    },
    [props.nodes, props.onDisconnect],
  )

  const onSelectionChange = useCallback((box: { x1: number, y1: number, x2: number, y2: number }) => {
    const nodes = props.nodes.filter((node) => {
      const { width = INITIAL_WIDTH, height = INITIAL_HEIGHT } = node
      const isOverlapping = (node.x >= box.x1 && node.x + width <= box.x2 && node.y >= box.y1 && node.y + height <= box.y2) ||
        (node.x <= box.x2 && node.x + width >= box.x1 && node.y <= box.y2 && node.y + height >= box.y1)
      return isOverlapping
    })
    updateSelection(nodes.map((node) => node.id))
  }, [props.nodes])

  const tryDeleteSelectedNodes = useCallback(() => {
    setSelectedNodes((oldNodes) => {
      if (oldNodes?.length && confirm(`Delete ${oldNodes.length === 1 ? 'this card' : oldNodes.length + ' cards'}?`)) {
        oldNodes.forEach(props.onNodeDelete)
        updateSelection([])
        return []
      }
      return oldNodes
    })
  }, [props.onNodeDelete, updateSelection])

  useOnKey(
    'Escape',
    () => {
      if (tempFrom.current) {
        tempFrom.current = null
        return
      }

      tryDeleteSelectedNodes()
    },
    [tryDeleteSelectedNodes],
  )

  useOnKey(
    'Delete',
    () => {
      if (document.activeElement?.closest('.Editable')) return
      tryDeleteSelectedNodes()
    },
    [tryDeleteSelectedNodes],
  )

  const sx = useMemo(() => ({ width: `${WIDTH}px`, height: `${HEIGHT}px` }), [])

  return (
    <div
      className={`Board ${props.isLocked ? 'Board_locked' : ''}`}
      style={sx}
      onClick={onBoardClick}
      onDoubleClick={onBoardDblClick}
    >
      {props.nodes?.map(renderNode)}

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {props.edges?.map(renderEdge)}
        {tempFrom.current && renderEdge({ id: 'temp', fromNode: tempFrom.current, toNode: tempFrom.current }, undefined, undefined, mousePosition)}
      </svg>

      {Object.entries(props.cursors).map(([id, c]) => (
        id === props.clientId ? null : (
          <div
            key={id}
            className="RemoteCursor"
            style={{ left: c.x, top: c.y, '--cursor-color': c.color } as CSSProperties }
          />
        )
      ))}

      <SelectionBox onChange={onSelectionChange} />

      <ColorPicker color={props.backgroundColor} onColorChange={onBackgroundColorChange} />
    </div>
  )
}
