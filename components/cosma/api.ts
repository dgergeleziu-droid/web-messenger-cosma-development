'use client'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (res.status === 401) onUnauthorized?.()
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data?.error || 'Ошибка сети')
  return data as T
}

const MAX_UPLOAD = 5.5 * 1024 * 1024

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  if (file.size < 600 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
}

export type Uploaded = { url: string; name: string; size: number; mime: string }

export async function uploadFile(file: File | Blob, name?: string): Promise<Uploaded> {
  let blob: Blob = file
  let fileName = name ?? (file instanceof File ? file.name : 'file')
  if (file instanceof File && file.type.startsWith('image/')) {
    blob = await compressImage(file)
    if (blob !== file) fileName = fileName.replace(/\.\w+$/, '') + '.jpg'
  }
  if (blob.size > MAX_UPLOAD) throw new ApiError(413, 'Файл слишком большой (максимум 5 МБ)')
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(fileName),
    },
    body: blob,
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data?.error || 'Не удалось загрузить файл')
  return data
}
