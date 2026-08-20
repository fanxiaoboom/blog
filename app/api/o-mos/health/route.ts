import { getOmosApiHeaders, getOmosApiUrl, omosApiUnavailable } from '~/o-mos/web/next-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiUrl = getOmosApiUrl()
  const apiHeaders = getOmosApiHeaders()
  if (!apiUrl || !apiHeaders) return omosApiUnavailable()

  try {
    const response = await fetch(`${apiUrl}/health`, { cache: 'no-store', headers: apiHeaders })
    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch {
    return Response.json(
      { detail: '无法连接 O-mos API。请确认本地服务正在运行。' },
      { status: 503 },
    )
  }
}
