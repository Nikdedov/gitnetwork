import { describe, it, expect } from 'vitest'
import {
  validateImage,
  safeImageName,
  arrayBufferToBase64,
  base64ToUtf8,
  utf8ToBase64,
  MAX_IMAGE_BYTES,
} from './media'

describe('validateImage', () => {
  it('accepts jpg, png and webp', () => {
    expect(validateImage({ name: 'a.jpg', type: 'image/jpeg', size: 100 })).toBeNull()
    expect(validateImage({ name: 'a.png', type: 'image/png', size: 100 })).toBeNull()
    expect(validateImage({ name: 'a.webp', type: 'image/webp', size: 100 })).toBeNull()
  })

  it('rejects unsupported types', () => {
    expect(validateImage({ name: 'a.gif', type: 'image/gif', size: 100 })).toContain('Only JPG')
    expect(validateImage({ name: 'a.mp4', type: 'video/mp4', size: 100 })).toContain('Only JPG')
  })

  it('rejects oversized files', () => {
    expect(validateImage({ name: 'a.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toContain(
      'too large',
    )
  })

  it('accepts a file exactly at the limit', () => {
    expect(validateImage({ name: 'a.png', type: 'image/png', size: MAX_IMAGE_BYTES })).toBeNull()
  })

  it('rejects empty files', () => {
    expect(validateImage({ name: 'a.png', type: 'image/png', size: 0 })).toContain('empty')
  })
})

describe('safeImageName', () => {
  it('sanitizes path separators and odd characters', () => {
    expect(safeImageName('../../etc/passwd', 'image/png')).toBe('passwd.png')
    expect(safeImageName('my photo (1).png', 'image/png')).toBe('my_photo_(1).png')
  })

  it('forces the extension from the MIME type', () => {
    expect(safeImageName('a.jpg', 'image/png')).toBe('a.png')
  })

  it('strips leading dots', () => {
    expect(safeImageName('..hidden.png', 'image/png')).toBe('hidden.png')
  })

  it('truncates long stems', () => {
    const name = safeImageName('a'.repeat(200) + '.png', 'image/png')
    expect(name.length).toBeLessThanOrEqual(64 + 4)
  })
})

describe('base64 helpers', () => {
  it('round-trips UTF-8 text', () => {
    const text = 'Привет, мир! 🌍'
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text)
  })

  it('encodes buffers correctly', () => {
    const bytes = [0, 1, 2, 250, 251, 255]
    const buf = new Uint8Array(bytes).buffer
    const decoded = Uint8Array.from(atob(arrayBufferToBase64(buf)), (c) => c.charCodeAt(0))
    expect([...decoded]).toEqual(bytes)
  })

  it('handles large buffers in chunks', () => {
    const big = new Uint8Array(0x10000).fill(7)
    const b64 = arrayBufferToBase64(big.buffer)
    const back = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    expect(back.length).toBe(0x10000)
    expect(back.every((b) => b === 7)).toBe(true)
  })
})
