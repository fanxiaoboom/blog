import { getOmosApiUrl, omosApiUnavailable } from '~/o-mos/web/next-api'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const apiUrl = getOmosApiUrl()
  if (!apiUrl) return omosApiUnavailable()

  try {
    const payload = await request.json()
    const response = await fetch(`${apiUrl}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
        'X-Omos-Session-Id': response.headers.get('X-Omos-Session-Id') || '',
      },
    })
  } catch {
    return Response.json(
      { detail: '无法连接 o-mos API。请确认本地服务正在运行。' },
      { status: 503 },
    )
  }
}
