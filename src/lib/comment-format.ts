/**
 * Pure formatting helpers for comment UI.
 * No side effects; safe to import in tests without DOM/React.
 */

/** Pleasant avatar background colors matching the design palette. */
const AVATAR_PALETTE = [
  '#D2937B', // terracotta
  '#8FB0C4', // dusty blue
  '#9DB58F', // sage
  '#C4A882', // warm tan
  '#B49BC8', // soft lavender
  '#E8A87C', // peach
  '#7EA8A0', // teal grey
  '#C4887B', // rose
]

/**
 * Derive up to 2 uppercase initials from an author name.
 * - Two words ("Maya Reyes") → "MR"
 * - One word ("ada") → "AD" (first two chars)
 * - Empty → ""
 */
export function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  const words = trimmed.split(/\s+/)
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Deterministic avatar background color derived from a hash of the author name.
 * Always returns a value from AVATAR_PALETTE.
 */
export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    // djb2-style hash
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

/**
 * Human-readable relative time from an ISO 8601 string.
 *
 * - < 60s   → "just now"
 * - < 60m   → "Nm"
 * - < 24h   → "Nh"
 * - < 30d   → "Nd"
 * - else    → "YYYY-MM-DD"
 *
 * @param iso  ISO 8601 date string (from DB createdAt field)
 * @param now  Optional override for "current time" (useful in tests)
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 30) return `${diffDays}d`

  // Fall back to YYYY-MM-DD using the UTC date embedded in the ISO string
  return iso.slice(0, 10)
}
