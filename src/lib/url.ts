import type { DocumentKind } from './dinky-api.js'

export function getUrlId() {
  const url = new URL(window.location.href)
  const q = url.searchParams.get('q')
  return q ? q.replace(/(.+?_)?(.+)$/gi, '$2') : ''
}

function slugify(text: string) {
  return text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
}

function addPrefix(id: string, title?: string) {
  const prefix = title ? slugify(title.slice(0, 50)) : ''
  return prefix ? `${prefix}_${id}` : id
}

export function getUrlKind(): DocumentKind | '' {
  const url = new URL(window.location.href)
  return url.searchParams.get('kind') === 'doc' ? 'doc' : ''
}

export function setUrlId(id: string, title?: string, kind?: DocumentKind) {
  const url = new URL(window.location.href)
  url.searchParams.set('q', addPrefix(id, title))
  if (kind === 'doc') {
    url.searchParams.set('kind', 'doc')
  } else {
    url.searchParams.delete('kind')
  }
  window.history.replaceState({}, '', url.toString())
}

export function makeUrl(id: string, title?: string, kind?: DocumentKind) {
  const url = new URL(window.location.origin)
  url.searchParams.set('q', addPrefix(id, title))
  if (kind === 'doc') {
    url.searchParams.set('kind', 'doc')
  }
  return url.toString()
}

export function getUrlPage() {
  const url = new URL(window.location.href)
  const p = parseInt(url.searchParams.get('page') || '1', 10)
  return Number.isFinite(p) && p > 0 ? p : 1
}

export function setUrlPage(page: number) {
  const url = new URL(window.location.href)
  url.searchParams.set('page', String(page))
  window.history.replaceState({}, '', url.toString())
}
