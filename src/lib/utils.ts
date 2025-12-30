export function debounce<T extends (...args: unknown[]) => ReturnType<T> | PromiseLike<ReturnType<T>>>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    return new Promise((resolve) => {
      timer = setTimeout(() => {
        const result = fn(...args)
        if (result instanceof Promise) {
          result.then(resolve)
        } else {
          resolve(result)
        }
      }, ms)
    })
  }
}

export function randomId(length = 8) {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)

  let randomId = ''
  for (let i = 0; i < array.length; i++) {
    randomId += array[i].toString(16).padStart(2, '0')
  }

  return randomId
}

export function randomEmoji() {
  const unicodeRanges = [
    // Animals
    [0x1f400, 0x1f43f],
    // Plants
    [0x1f330, 0x1f335],
  ]
  const emojiGroup = unicodeRanges[Math.floor(Math.random() * unicodeRanges.length)]
  const emoji = String.fromCodePoint(emojiGroup[0] + Math.floor(Math.random() * (emojiGroup[1] - emojiGroup[0])))
  return emoji
}

export function randomBrightColor() {
  const h = Math.floor(Math.random() * 360)
  const s = 70 + Math.floor(Math.random() * 30)
  const l = 50 + Math.floor(Math.random() * 10)
  return `hsl(${h} ${s}% ${l}%)`
}

export function randomPastelColor() {
  // Same pastel colors as ColorPicker, excluding the first off-white color
  const PASTEL_COLORS = [
    '#ffe8ed',
    '#d6e2e7',
    '#bbeebb',
    '#fefeca',
    '#e1d8f0',
    '#ffd9a3',
    '#d9f3e6',
    '#BFE8FE',
    '#fff2d9',
  ]
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
}


export function parseUrl(text = '') {
  const match = text.match(/^((data:|https?:)\/\/\S+)(\s+|<br\s*\/?>)??$/) // match URL followed by space or <br>
  return match ? match[1] || '' : ''
}

export function parseImageUrl(url: string) {
  return /^data:image\//.test(url) || /\.(jpe?g|png|gif|webp|svg)($|\?)/.test(url) ? url : ''
}

export function parseAudioUrl(url: string) {
  return /\.(mp3|wav|ogg|flac|aac|wma|alac|aiff|webm)($|\?)/.test(url) ? url : ''
}

export function uniqueBy<T>(array: T[], key: keyof T) {
  const seen = new Set()
  return array.filter((item) => {
    const value = item[key]
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}
