const configuredApiUrl = process.env.OMOS_API_URL?.replace(/\/$/, '')

export function getOmosApiUrl() {
  return configuredApiUrl || null
}

export function omosApiUnavailable() {
  return Response.json(
    {
      detail:
        'O-mos API 尚未配置。请在网站服务中设置 OMOS_API_URL，再启动本地 o-mos-api。',
    },
    { status: 503 },
  )
}
