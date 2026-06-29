import { act, renderHook, waitFor } from '@testing-library/react'
import { useSession } from '@supabase/auth-helpers-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTextDoc } from '../lib/doc-kind.js'
import { loadDoc, saveDoc, saveDocBeacon } from '../lib/dinky-api.js'
import { useTextDocState } from './useTextDocState.js'

vi.mock('@supabase/auth-helpers-react', () => ({
  useSession: vi.fn(),
}))

vi.mock('../lib/dinky-api.js', () => ({
  loadDoc: vi.fn(),
  saveDoc: vi.fn(),
  saveDocBeacon: vi.fn(),
}))

describe('useTextDocState', () => {
  beforeEach(() => {
    // shouldAdvanceTime allows waitFor's internal polling (which uses real setTimeout) to work
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(useSession).mockReturnValue({
      access_token: 'token-1',
      user: { id: 'user-1' },
    } as ReturnType<typeof useSession>)
    vi.mocked(loadDoc).mockResolvedValue({ ...createTextDoc('doc-1', 'user-1'), title: 'RFC' })
    vi.mocked(saveDoc).mockResolvedValue({ status: 200, key: 'doc-1' })
    vi.mocked(saveDocBeacon).mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads an existing text document and marks the owner editable', async () => {
    const { result } = renderHook(() => useTextDocState('doc-1'))

    await waitFor(() => expect(result.current.doc?.title).toBe('RFC'))

    expect(result.current.isOwner).toBe(true)
    expect(result.current.isLocked).toBe(false)
  })

  it('creates a draft text document when load misses', async () => {
    vi.mocked(loadDoc).mockRejectedValueOnce(new Error('Document not found'))

    const { result } = renderHook(() => useTextDocState('doc-new'))

    await waitFor(() => expect(result.current.doc?.id).toBe('doc-new'))

    expect(result.current.doc).toMatchObject({
      id: 'doc-new',
      kind: 'doc',
      schemaVersion: 2,
      userId: 'user-1',
    })
  })

  it('debounces owner autosave after title changes', async () => {
    const { result } = renderHook(() => useTextDocState('doc-1'))

    await waitFor(() => expect(result.current.doc).not.toBeNull())

    act(() => {
      result.current.onTitleChange('Updated RFC')
    })

    expect(saveDoc).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(saveDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc-1', title: 'Updated RFC', kind: 'doc' }),
      'user-1',
    )
  })

  it('saves with beacon before unload for owners with changes', async () => {
    const { result } = renderHook(() => useTextDocState('doc-1'))

    await waitFor(() => expect(result.current.doc).not.toBeNull())

    act(() => {
      result.current.onTitleChange('Beacon RFC')
    })

    window.dispatchEvent(new Event('beforeunload'))

    expect(saveDocBeacon).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc-1', title: 'Beacon RFC', kind: 'doc' }),
      'token-1',
      'user-1',
    )
  })
})
