import { useCallback, useMemo, useRef, useState, useEffect, type CSSProperties } from 'react'
import type { CanvasEdge, CanvasNode } from '../../types/canvas'
import { DraggableNode } from './DraggableNode.js'
import { Edge } from './Edge.js'
import { useMousePosition } from '../../hooks/useMousePosition.js'
import { useOnKey } from '../../hooks/useOnKey.js'
import { SelectionBox } from './SelectionBox.js'
import { INITIAL_HEIGHT, INITIAL_WIDTH } from './Editable.js'
import { ColorPicker } from '../ColorPicker.js'
import { randomPastelColor } from '../../lib/utils.js'

type BoardProps = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  backgroundColor?: string
  isLocked?: boolean
  onNodeCreate: (node: Partial<CanvasNode>) => CanvasNode
  onNodeDelete: (id: string) => void
  onNodeUpdate: (id: string, props: Partial<CanvasNode>) => void
  onConnect: (from: string, to: string, color?: string) => void
  onDisconnect: (from: string, to: string) => void
  onBackgroundColorChange: (color: string) => void
  cursors: Record<string, { x: number; y: number; color: string }>
  clientId: string
  onCursorMove: (x: number, y: number) => void
  selections: Record<string, string[]>
  onSelectNodes: (ids: string[]) => void
  // Floating header props
  title?: string
  onTitleChange?: (title: string) => void
  onToggleSidebar?: () => void
  onShareSession?: () => void
  onShare?: () => void
  isOwner?: boolean
}

const WIDTH = 5000
const HEIGHT = 5000

export function Board(props: BoardProps) {
  const tempFrom = useRef<string | null>(null)
  const [tempEdge, setTempEdge] = useState<CanvasEdge | null>(null)
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
      if (tempFrom.current && tempEdge) {
        if (tempFrom.current !== id) {
          props.onConnect(tempFrom.current, id, tempEdge.color)
        }
        tempFrom.current = null
        setTempEdge(null)
      } else {
        updateSelection([id])
      }
    },
    [props.onConnect, updateSelection, tempEdge],
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

    if (tempFrom.current && tempEdge) {
      const node = onNodeCreate()
      props.onConnect(tempFrom.current, node.id, tempEdge.color)
      tempFrom.current = null
      setTempEdge(null)
    }
  }, [onNodeCreate, props.onConnect, updateSelection, tempEdge])

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
    const color = randomPastelColor()
    tempFrom.current = id
    setTempEdge({ id: 'temp', fromNode: id, toNode: id, color })
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
          isLocked={props.isLocked}
        />
      )
    },
    [onNodeUpdate, selectedNodes, onConnectStart, onNodeClick, remoteSelectionColor, props.isLocked],
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
          color={edge.color}
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
        setTempEdge(null)
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

  const onTitleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    props.onTitleChange?.(e.target.value)
  }, [props.onTitleChange])

  const stopPropagationClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <div
      className={`Board ${props.isLocked ? 'Board_locked' : ''}`}
      style={sx}
      onClick={onBoardClick}
      onDoubleClick={onBoardDblClick}
    >
      {/* Floating Header */}
      <div className="FloatingHeader" onClick={stopPropagationClick}>
        <div className="LogoFloat">
          <div className="LogoIcon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="LogoText">SpaceNotes</span>
          <input
            className="TitleInput"
            value={props.title ?? ''}
            onChange={onTitleInput}
            placeholder="Untitled space"
            readOnly={props.isLocked}
          />
          {props.isLocked && (
            <div className="LockIndicator" title="View only - you don't have edit access">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          )}
        </div>
        <button className="ShareFloat" onClick={props.onShare} title="Copy link to clipboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
        <div className="HeaderActions">
          <button className="MenuBtn" onClick={props.onToggleSidebar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {props.nodes?.map(renderNode)}

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {props.edges?.map(renderEdge)}
        {tempEdge && renderEdge(tempEdge, undefined, undefined, mousePosition)}
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
