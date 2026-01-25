import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useRealtimeDocState } from '../hooks/useRealtimeDocState.js'
import { useInitApp } from '../hooks/useInitApp.js'
import type { DinkyDataV2 } from '../lib/dinky-api.js'

const DocumentContext = createContext<ReturnType<typeof useInitApp> & ReturnType<typeof useRealtimeDocState> | null>(null)

export function DocumentProvider({ children }: { children: ReactNode }) {
  const realtimeState = useRealtimeDocState()
  const initState = useInitApp(realtimeState)

  // Expose global function to import space JSON
  useEffect(() => {
    const importSpace = (json: string) => {
      try {
        const data = JSON.parse(json) as Partial<DinkyDataV2>
        if (!data.nodes || !Array.isArray(data.nodes)) {
          throw new Error('Invalid space JSON: missing nodes array')
        }
        realtimeState.setDoc((prev) => ({
          ...prev,
          nodes: data.nodes ?? [],
          edges: data.edges ?? [],
          title: data.title ?? prev.title,
          backgroundColor: data.backgroundColor ?? prev.backgroundColor,
        }))
        console.log('Space imported successfully:', data.nodes.length, 'nodes,', data.edges?.length ?? 0, 'edges')
        return true
      } catch (err) {
        console.error('Failed to import space:', err)
        return false
      }
    }
    ;(window as unknown as { importSpace: typeof importSpace }).importSpace = importSpace
  }, [realtimeState.setDoc])

  return (
    <DocumentContext.Provider value={{ ...realtimeState, ...initState }}>
      {children}
    </DocumentContext.Provider>
  )
}

export function useDocument() {
  const ctx = useContext(DocumentContext)
  if (!ctx) throw new Error('useDocument must be used within DocumentProvider')
  return ctx
}
