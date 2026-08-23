/**
 * Client-side encryption utilities using Web Crypto API (AES-GCM)
 */

export interface EncryptedData {
  ciphertext: string
  iv: string
  authTag: string
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )
  return key
}

export async function exportEncryptionKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return arrayBufferToBase64(exported)
}

export async function importEncryptionKey(keyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(keyString)
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function encryptData(data: string, key: CryptoKey): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const encodedData = new TextEncoder().encode(data)
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  )
  
  const ciphertext = new Uint8Array(ciphertextBuffer)
  
  // AES-GCM auth tag is the last 16 bytes of the ciphertext buffer
  const authTag = ciphertext.slice(ciphertext.length - 16)
  const actualCiphertext = ciphertext.slice(0, ciphertext.length - 16)
  
  return {
    ciphertext: arrayBufferToBase64(actualCiphertext.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    authTag: arrayBufferToBase64(authTag.buffer),
  }
}

export async function decryptData(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext)
  const iv = base64ToArrayBuffer(encrypted.iv)
  const authTag = base64ToArrayBuffer(encrypted.authTag)
  
  // Combine ciphertext and auth tag for decryption
  const ciphertextWithTag = new Uint8Array(ciphertext.byteLength + authTag.byteLength)
  ciphertextWithTag.set(new Uint8Array(ciphertext), 0)
  ciphertextWithTag.set(new Uint8Array(authTag), ciphertext.byteLength)
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertextWithTag
  )
  
  return new TextDecoder().decode(decryptedBuffer)
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

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes.buffer
}
