import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sanitizeHtml } from '../../lib/sanitize-html.js'
import { parseUrl } from '../../lib/utils.js'
import { fetchPreview, type LinkPreview } from '../../lib/link-preview.js'

type EditableProps = {
  id: string
  content: string
  width?: number
  height?: number
  onChange: (content: string) => void
  onHeightChange: (height: number) => void
}

export const INITIAL_WIDTH = 165
export const INITIAL_HEIGHT = 90

const getPreviewHtml = (preview: LinkPreview) => {
  const domain = new URL(preview.url).hostname
  return sanitizeHtml([
    preview.image ? `<img src=${preview.image} crossorigin="anonymous" />` : '',
    `<h4>${preview.title}</h4>`,
    `<a href=${preview.url} target="_blank" nofollow noopener>${domain}</a>`,
  ].join(''))
}

export const Editable = ({ id, content, width, height, onChange, onHeightChange }: EditableProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const isManualHeight = height && height === Math.round(height)
  const [hasMinHeight, setHasMinHeight] = useState(!content && !isManualHeight)
  const isFocusedRef = useRef(false)

  useEffect(() => {
    if (ref.current && !content) {
      ref.current.focus()
      isFocusedRef.current = true
    }
  }, [content])

  // Update height based on content changes
  const updateHeight = useCallback(() => {
    if (!isManualHeight && ref.current) {
      onHeightChange(ref.current.offsetHeight + 0.01)
    }
  }, [onHeightChange, isManualHeight])

  // Blur event handler to sanitize content and update height
  const onBlur = useCallback((e) => {
    isFocusedRef.current = false
    const { innerHTML = '' } = e.target
    const newContent = sanitizeHtml(innerHTML)
    onChange(newContent)
    if (newContent) {
      setHasMinHeight(false)
    }
    const timeout = setTimeout(updateHeight, 100)
    return () => clearTimeout(timeout)
  }, [onChange, updateHeight])

  // Allow clicking on links to open them in a new tab
  const onClick = useCallback((e) => {
    if (e.target instanceof HTMLAnchorElement) {
      e.preventDefault()
      window.open(e.target.href, '_blank')
    }
  }, [])

  const onFocus = useCallback(() => {
    isFocusedRef.current = true
  }, [])

  // Clear text selection
  const clearSelection = useCallback(() => {
    const selection = window.getSelection()
    selection?.removeAllRanges()
  }, [])

  const isEditableFocused = useCallback(() => {
    if (isFocusedRef.current) return true
    if (typeof document === 'undefined') return false
    return ref.current === document.activeElement
  }, [])

  // Prevent dragging if it's focused
  const onPointerMove = useCallback((e) => {
    if (isEditableFocused()) {
      e.stopPropagation()
    } else {
      clearSelection()
      e.preventDefault()
    }
  }, [clearSelection, isEditableFocused])

  const onPointerDown = useCallback(() => {
    if (!isEditableFocused()) clearSelection()
  }, [isEditableFocused, clearSelection])

  // Sanitize content and prepare it for rendering
  const htmlContent = useMemo(() => ({ __html: sanitizeHtml(content) }), [content])

  useEffect(() => {
    if (content) {
      const url = parseUrl(content)
      if (url) {
        fetchPreview(url).then((preview) => {
          onChange(getPreviewHtml(preview))
        })
      }
    }
  }, [content, onChange])

  useEffect(updateHeight, [updateHeight])

  const style = useMemo(() => ({
    width: width || INITIAL_WIDTH,
    height: isManualHeight ? height + 'px' : undefined,
    minHeight: !isManualHeight && hasMinHeight ? INITIAL_HEIGHT + 'px' : undefined,
  }), [width, height, isManualHeight, hasMinHeight])

  return (
    <div
      ref={ref}
      id={id}
      className="Editable"
      contentEditable
      dangerouslySetInnerHTML={htmlContent}
      onInput={updateHeight}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onBlur={onBlur}
      onFocus={onFocus}
      onClick={onClick}
      style={style}
    />
  )
}
