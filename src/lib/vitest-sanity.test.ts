import { describe, expect, it } from 'vitest'

describe('vitest setup', () => {
  it('runs TypeScript tests in jsdom', () => {
    expect(window.document).toBeDefined()
  })
})
