export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_PDF_BYTES = 20 * 1024 * 1024
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export const ALLOWED_PDF_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
}

export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
}

export const ALLOWED_LINK_TYPES: Record<string, string> = {
  'link': '.link',
}

export interface MediaFile {
  name: string
  type: string
  size: number
  data: ArrayBuffer
}

export interface LinkMedia {
  url: string
  title?: string
  description?: string
  imageUrl?: string
}

export type MediaAttachment = MediaFile | LinkMedia

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

export function validatePdf(file: { name: string; type: string; size: number }): string | null {
  if (!ALLOWED_PDF_TYPES[file.type]) {
    return 'Only PDF files are supported'
  }
  if (file.size > MAX_PDF_BYTES) {
    return 'PDF is too large (max 20 MB)'
  }
  if (file.size === 0) return 'PDF is empty'
  return null
}

export function validateDocument(file: { name: string; type: string; size: number }): string | null {
  if (!ALLOWED_DOCUMENT_TYPES[file.type]) {
    return 'Only DOC, DOCX, XLS, XLSX, PPT, PPTX documents are supported'
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'Document is too large (max 10 MB)'
  }
  if (file.size === 0) return 'Document is empty'
  return null
}

export function validateMedia(file: { name: string; type: string; size: number }): string | null {
  const imageError = validateImage(file)
  if (!imageError && ALLOWED_IMAGE_TYPES[file.type]) {
    return null
  }
  const pdfError = validatePdf(file)
  if (!pdfError && ALLOWED_PDF_TYPES[file.type]) {
    return null
  }
  const docError = validateDocument(file)
  if (!docError && ALLOWED_DOCUMENT_TYPES[file.type]) {
    return null
  }
  return 'Unsupported file type or file too large'
}

export function safeMediaName(name: string, type: string): string {
  const base = name
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._()-]/g, '_')
    .replace(/^\.+/, '')
  
  let ext = '.file'
  if (ALLOWED_IMAGE_TYPES[type]) {
    ext = ALLOWED_IMAGE_TYPES[type]
  } else if (ALLOWED_PDF_TYPES[type]) {
    ext = ALLOWED_PDF_TYPES[type]
  } else if (ALLOWED_DOCUMENT_TYPES[type]) {
    const docExts: Record<string, string> = {
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    }
    ext = docExts[type] || '.doc'
  } else if (ALLOWED_PDF_TYPES[type]) {
    ext = '.pdf'
  }
  
  const stem = (base ?? 'media').replace(/\.[a-z0-9]+$/i, '')
  return `${stem.slice(0, 64)}${ext}`
}

// Backward compatibility aliases
export const safeImageName = safeMediaName
export const validateImageForTest = validateImage

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
