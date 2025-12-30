import { useEffect, useState } from 'react'
import { EditorPage } from '../pages/EditorPage.js'
import { getUrlId, setUrlId } from '../lib/url.js'
import { randomId } from '../lib/utils.js'

export function App() {
  const [id, setId] = useState(() => getUrlId())

  // Auto-create new space when landing without doc ID
  useEffect(() => {
    if (!id) {
      const newId = randomId()
      setUrlId(newId)
      setId(newId)
    }
  }, [id])

  // Always show EditorPage - it handles everything now
  return <EditorPage />
}
