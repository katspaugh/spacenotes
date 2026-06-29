export function getUrlId() {
  const url = new URL(window.location.href)
  const q = url.searchParams.get('q')
  return q ? q.replace(/(.+?_)?(.+)$/gi, '$2') : '' // ignore any prefix like 'state_'
}

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
}

function addPrefix(id: string, title?: string) {
  const prefix = title ? slugify(title.slice(0, 50)) : ''
  return prefix ? `${prefix}_${id}` : id
}

export function setUrlId(id: string, title?: string, _kind?: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('q', encodeURIComponent(addPrefix(id, title)))
  window.history.replaceState({}, '', url.toString())
}

export function makeUrl(id: string, title?: string) {
  return `${window.location.origin}/?q=${encodeURIComponent(addPrefix(id, title))}`
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
