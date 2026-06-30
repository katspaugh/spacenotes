import { useEffect, useState } from 'react'
import { EditorPage } from '../pages/EditorPage.js'
import { getUrlId, setUrlId } from '../lib/url.js'
import { randomId } from '../lib/utils.js'

export function App() {
  const [id, setId] = useState(() => getUrlId())

  useEffect(() => {
    if (!id) {
      const newId = randomId()
      setUrlId(newId, undefined, 'space')
      setId(newId)
    }
  }, [id])

  return <EditorPage />
}
