import { describe, it, expect } from 'vitest'
import { initials, avatarColor, relativeTime } from './comment-format.js'

const NOW = new Date('2025-06-01T12:00:00Z')

// Fixed palette exported for test validation
const AVATAR_PALETTE = [
  '#D2937B',
  '#8FB0C4',
  '#9DB58F',
  '#C4A882',
  '#B49BC8',
  '#E8A87C',
  '#7EA8A0',
  '#C4887B',
]

describe('initials', () => {
  it('returns uppercase initials for a two-word name', () => {
    expect(initials('Maya Reyes')).toBe('MR')
  })

  it('returns first two chars uppercase for a single-word name', () => {
    expect(initials('ada')).toBe('AD')
  })

  it('returns first two chars for a single-word name longer than 2 chars', () => {
    expect(initials('Ivan')).toBe('IV')
  })

  it('returns empty string for an empty name', () => {
    expect(initials('')).toBe('')
  })

  it('uses first and last word for names with 3+ words', () => {
    expect(initials('John Michael Smith')).toBe('JS')
  })

  it('handles a name with trailing whitespace', () => {
    expect(initials('  Ana  ')).toBe('AN')
  })
})

describe('avatarColor', () => {
  it('is deterministic — same name always returns the same color', () => {
    expect(avatarColor('Maya Reyes')).toBe(avatarColor('Maya Reyes'))
    expect(avatarColor('Dmitri K.')).toBe(avatarColor('Dmitri K.'))
  })

  it('returns a color from the fixed palette', () => {
    for (const name of ['Maya Reyes', 'Dmitri K.', 'Ana B.', 'Ivan', '']) {
      expect(AVATAR_PALETTE).toContain(avatarColor(name))
    }
  })

  it('returns a hex string starting with #', () => {
    expect(avatarColor('Test User')).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('relativeTime', () => {
  it('returns "just now" for times within the last 60 seconds', () => {
    const iso = new Date(NOW.getTime() - 30 * 1000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('just now')
  })

  it('returns "0m" boundary: exactly 0 seconds ago is "just now"', () => {
    expect(relativeTime(NOW.toISOString(), NOW)).toBe('just now')
  })

  it('returns minutes for 2–59 minutes ago', () => {
    const iso = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('5m')
  })

  it('returns hours for 1–23 hours ago', () => {
    const iso = new Date(NOW.getTime() - 3 * 3600 * 1000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('3h')
  })

  it('returns days for 1–29 days ago', () => {
    const iso = new Date(NOW.getTime() - 7 * 86400 * 1000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('7d')
  })

  it('returns YYYY-MM-DD for dates 30+ days old', () => {
    const iso = '2024-01-15T10:00:00Z'
    expect(relativeTime(iso, NOW)).toBe('2024-01-15')
  })

  it('returns YYYY-MM-DD for dates from the previous year', () => {
    const iso = '2023-12-01T00:00:00Z'
    const result = relativeTime(iso, NOW)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
