export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export interface MediaFile {
  name: string
  type: string
  size: number
  data: ArrayBuffer
}

export function validateImage(file: { name: string; type: string; size: number }): string | null {
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    return 'Only JPG, PNG and WebP images are supported'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large (max 10 MB)'
  }
  if (file.size === 0) return 'Image is empty'
  return null
}

export function safeImageName(name: string, type: string): string {
  const base = name
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._()-]/g, '_')
    .replace(/^\.+/, '')
  const ext = ALLOWED_IMAGE_TYPES[type] ?? '.img'
  const stem = (base ?? 'image').replace(/\.[a-z0-9]+$/i, '')
  return `${stem.slice(0, 64)}${ext}`
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export function base64ToUtf8(b64: string): string {
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}
