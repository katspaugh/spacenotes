import { useEffect, useState } from 'react'
import { Editor } from '../components/Editor.js'
import { DocumentProvider } from '../context/DocumentContext.js'
import { loadDoc, type DocumentKind } from '../lib/dinky-api.js'
import { getUrlId, getUrlKind } from '../lib/url.js'
import { DocEditorPage } from './DocEditorPage.js'

export function EditorPage() {
  const [kind, setKind] = useState<DocumentKind | null>(null)

  useEffect(() => {
    const id = getUrlId()
    const urlKind = getUrlKind()

    if (!id) {
      setKind('space')
      return
    }

    if (urlKind === 'doc') {
      loadDoc(id)
        .then((doc) => setKind(doc.kind))
        .catch(() => setKind('doc'))
      return
    }

    loadDoc(id)
      .then((doc) => setKind(doc.kind))
      .catch(() => setKind('space'))
  }, [])

  if (!kind) {
    return <div>Loading...</div>
  }

  if (kind === 'doc') {
    return <DocEditorPage />
  }

  return (
    <DocumentProvider>
      <Editor />
    </DocumentProvider>
  )
}
