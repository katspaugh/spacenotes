import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { randomId } from '../lib/utils.js'
import type { CanvasNode, CanvasEdge } from '../types/canvas.js'
import type { RealtimeChannel } from '@supabase/supabase-js'

const CLIENT_ID_KEY = 'spacenotes-client-id'

function getClientId() {
  let id = sessionStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = randomId()
    sessionStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

export type RealtimeAction =
  | { type: 'node:create'; node: CanvasNode }
  | { type: 'node:update'; id: string; props: Partial<CanvasNode> }
  | { type: 'node:delete'; id: string }
  | { type: 'edge:create'; edge: CanvasEdge }
  | { type: 'edge:delete'; from: string; to: string }
  | { type: 'space:background'; color: string }
  | { type: 'space:title'; title: string }
  | { type: 'cursor:move'; x: number; y: number; color: string }
  | { type: 'node:select'; ids: string[]; color: string }

export function useRealtimeChannel(
  roomId: string,
  handlers: { apply: (action: RealtimeAction, clientId: string) => void },
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const clientId = useRef(getClientId())

  useEffect(() => {
    if (!roomId) return
    const channel = supabase.channel(`space:${roomId}`, {
      config: { broadcast: { self: false } },
    })

    channel.on('broadcast', { event: 'action' }, ({ payload }) => {
      if (!payload) return
      if (payload.clientId === clientId.current) return
      handlers.apply(payload.action as RealtimeAction, payload.clientId)
    })

    channel.subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, handlers])

  const send = useCallback((action: RealtimeAction) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'action',
      payload: { clientId: clientId.current, action },
    })
  }, [])

  return { send, clientId: clientId.current }
}
