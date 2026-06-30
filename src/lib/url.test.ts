import { beforeEach, describe, expect, it } from 'vitest'
import { getUrlKind, makeUrl, setUrlId } from './url.js'

describe('url helpers', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost/')
  })

  it('writes kind for document URLs', () => {
    setUrlId('doc-1', 'RFC Draft', 'doc')
    expect(window.location.search).toBe('?q=RFC-Draft_doc-1&kind=doc')
    expect(getUrlKind()).toBe('doc')
  })

  it('omits kind for space URLs', () => {
    setUrlId('space-1', 'Canvas', 'space')
    expect(window.location.search).toBe('?q=Canvas_space-1')
    expect(getUrlKind()).toBe('')
  })

  it('makes document URLs', () => {
    expect(makeUrl('doc-1', 'RFC Draft', 'doc')).toBe('http://localhost/?q=RFC-Draft_doc-1&kind=doc')
  })
})
