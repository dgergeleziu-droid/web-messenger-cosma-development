import 'server-only'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'

export async function withUser<T>(fn: (userId: string) => Promise<T>) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const data = await fn(user.id)
    if (data instanceof Response) return data
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[cosma] API error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export function dataUrlToResponse(dataUrl: string | null | undefined, filename?: string) {
  if (!dataUrl) return new Response('Not found', { status: 404 })
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl)
  if (!match) return new Response('Not found', { status: 404 })
  const mime = match[1] || 'application/octet-stream'
  const body = match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]))
  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Length': String(body.length),
    'Cache-Control': 'private, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
  }
  if (filename) headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(filename)}`
  return new Response(new Uint8Array(body), { headers })
}
