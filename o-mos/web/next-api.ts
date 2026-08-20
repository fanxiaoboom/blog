export function getOmosApiUrl() {
  return process.env.OMOS_API_URL?.replace(/\/$/, '') || null
}

export function getOmosApiHeaders() {
  const apiKey = process.env.OMOS_API_KEY
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : null
}

export function omosApiUnavailable() {
  return Response.json(
    {
      detail:
        'O-mos API 尚未完成安全配置。请在网站服务中设置 OMOS_API_URL 与 OMOS_API_KEY。',
    },
    { status: 503 },
  )
}
