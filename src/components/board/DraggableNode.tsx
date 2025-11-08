import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import type { CanvasNode } from '../../types/canvas'
import { draggable } from '../../lib/draggable.js'
import { Card } from '../Card.js'
import { Connector } from './Connector.js'
import { Resizer } from './Resizer.js'
import { INITIAL_HEIGHT, INITIAL_WIDTH } from './Editable.js'
import { ColorPicker } from '../ColorPicker.js'

type DraggableNodeProps = CanvasNode & {
  onNodeUpdate: (id: string, props: Partial<CanvasNode>) => void
  onConnectStart: (fromNode: string) => void
  onClick: (id: string) => void
  selected: boolean
  selectedByColor?: string
}

const BG_THRESHOLD = 110e3

const stopPropagation = (e) => e.stopPropagation()

export function DraggableNode(props: DraggableNodeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const position = useRef({ x: props.x, y: props.y })
  const size = useRef({ width: props.width ?? 0, height: props.height ?? 0 })
  const isBackgroundCard = props.color && props.width * props.height > BG_THRESHOLD
  const isDraggingRef = useRef(false)

  const onDragStart = useCallback(() => {
    isDraggingRef.current = true
    // Disable contentEditable to prevent text selection during drag
    // This only applies when not in edit mode (handled by onPointerMove in Editable)
    if (ref.current) {
      const editables = ref.current.querySelectorAll('[contenteditable="true"]')
      editables.forEach((el) => {
        el.setAttribute('contenteditable', 'false')
        el.classList.add('dragging')
      })
    }
  }, [])

  const onDragEnd = useCallback(() => {
    isDraggingRef.current = false
    // Re-enable contentEditable after a short delay
    setTimeout(() => {
      if (ref.current) {
        const editables = ref.current.querySelectorAll('.dragging')
        editables.forEach((el) => {
          el.setAttribute('contenteditable', 'true')
          el.classList.remove('dragging')
        })
      }
    }, 100)
  }, [])

  const onDrag = useCallback(
    (dx: number, dy: number) => {
      const pos = position.current
      const newPosition = { x: Math.round(pos.x + dx), y: Math.round(pos.y + dy) }
      props.onNodeUpdate(props.id, newPosition)
      return newPosition
    },
    [props.onNodeUpdate, props.id, position],
  )

  const onContentChange = useCallback((content: string) => {
    props.onNodeUpdate(props.id, { content })
  }, [props.id, props.onNodeUpdate])

  const onHeightChange = useCallback((height: number) => {
    props.onNodeUpdate(props.id, { height })
  }, [props.id, props.onNodeUpdate])

  const onConnectStart = useCallback(() => {
    props.onConnectStart(props.id)
  }, [props.id, props.onConnectStart])

  const onClick = useCallback((e) => {
    e.stopPropagation()
    props.onClick(props.id)
  }, [props.id, props.onClick])

  const onResize = useCallback(
    (dx: number, dy: number) => {
      const oldSize = size.current
      const newSize = {
        width: Math.round((oldSize.width || INITIAL_WIDTH) + dx),
        height: Math.round((oldSize.height || INITIAL_HEIGHT) + dy),
      }
      props.onNodeUpdate(props.id, newSize)
      return newSize
    },
    [props.id, props.onNodeUpdate, size],
  )

  const onResizeReset = useCallback(
    () => {
      const newSize = {
        width: undefined,
        height: undefined,
      }
      props.onNodeUpdate(props.id, newSize)
      return newSize
    },
    [props.id, props.onNodeUpdate, size],
  )

  const onColorChange = useCallback((color: string) => {
    props.onNodeUpdate(props.id, { color })
  }, [props.id, props.onNodeUpdate])

  useEffect(() => {
    position.current.x = props.x
    position.current.y = props.y
  }, [props.x, props.y])

  useEffect(() => {
    size.current.width = props.width
    size.current.height = props.height
  }, [props.width, props.height])

  useEffect(() => {
    if (!ref.current) return
    return draggable(ref.current, onDrag, onDragStart, onDragEnd)
  }, [onDrag, onDragStart, onDragEnd])

  const sx = useMemo(() => ({
    transform: `translate(${props.x}px, ${props.y}px)`,
  }), [props.x, props.y])

  const className = `DraggableNode${props.selected ? ' DraggableNode_selected' : ''}${props.selectedByColor ? ' DraggableNode_remoteSelected' : ''}${isBackgroundCard ? ' DraggableNode_background' : ''}`

  const style = useMemo(() => ({
    ...sx,
    '--remote-selection-color': props.selectedByColor,
  }), [sx, props.selectedByColor])

  return (
    <div
      className={className}
      style={style as CSSProperties}
      ref={ref}
      onClick={onClick}
      onDoubleClick={stopPropagation}
    >
      <div className="DraggableNode_content">
        <Card
          id={props.id}
          content={props.content}
          color={props.color}
          width={props.width}
          height={props.height}
          onContentChange={onContentChange}
          onHeightChange={onHeightChange}
        />

        <Connector onClick={onConnectStart} />

        <Resizer onResize={onResize} onReset={onResizeReset} />

        <ColorPicker color={props.color} onColorChange={onColorChange} />
      </div>
    </div>
  )
}
