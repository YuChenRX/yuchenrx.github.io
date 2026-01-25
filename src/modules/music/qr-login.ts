import { logger } from '@/utils/logger'

type QrGeneratePayload = {
  qrUrl: string
  qrKey: string
  expiresIn?: number
}

export type QrLoginStatus = 'pending' | 'scanned' | 'confirmed' | 'expired' | 'success' | 'error'

export type QrPollPayload = {
  status: QrLoginStatus
  message?: string
  cookies?: string[] | string
  refreshToken?: string
}

type QrLoginLibrary = {
  generate: () => Promise<unknown>
  poll: (key: string) => Promise<unknown>
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function findFunction(module: Record<string, unknown>, names: string[]): ((...args: unknown[]) => Promise<unknown>) | null {
  for (const name of names) {
    const fn = module[name]
    if (typeof fn === 'function') return fn as (...args: unknown[]) => Promise<unknown>
  }
  const def = module.default
  if (def && typeof def === 'object') {
    for (const name of names) {
      const fn = (def as Record<string, unknown>)[name]
      if (typeof fn === 'function') return fn as (...args: unknown[]) => Promise<unknown>
    }
  }
  return null
}

async function loadQrLoginLibrary(): Promise<QrLoginLibrary> {
  const mod = await import('bilibili-qr-login') as Record<string, unknown>
  const generate = findFunction(mod, [
    'generateQrCode',
    'generateQRCode',
    'getQrCode',
    'getQRCode',
    'getLoginQrCode',
    'createQrCode',
    'createQRCode'
  ])

  const poll = findFunction(mod, [
    'pollQrCode',
    'pollQRCode',
    'pollLoginQrCode',
    'checkQrCode',
    'checkQRCode'
  ])

  if (!generate || !poll) {
    logger.error('❌ bilibili-qr-login 未暴露可用的 generate/poll 方法')
    throw new Error('QR 登录库接口不兼容，请检查 bilibili-qr-login 版本')
  }

  return {
    generate: () => generate(),
    poll: (key: string) => poll(key)
  }
}

export async function createQrLogin(): Promise<QrGeneratePayload> {
  const client = await loadQrLoginLibrary()
  const data = await client.generate()
  const payload = data as Record<string, unknown>

  const qrUrl = getString(payload.qrUrl) || getString(payload.url)
  const qrKey = getString(payload.qrKey) || getString(payload.qrcode_key) || getString(payload.key)
  const expiresIn = typeof payload.expiresIn === 'number' ? payload.expiresIn : undefined

  if (!qrUrl || !qrKey) {
    logger.error('❌ bilibili-qr-login 返回数据格式异常:', data)
    throw new Error('二维码生成失败，返回数据格式异常')
  }

  return { qrUrl, qrKey, expiresIn }
}

export async function pollQrLogin(qrKey: string): Promise<QrPollPayload> {
  const client = await loadQrLoginLibrary()
  const data = await client.poll(qrKey)
  const payload = data as Record<string, unknown>

  const rawCode = payload.code ?? payload.status ?? (payload.data as Record<string, unknown> | undefined)?.code
  const message = getString(payload.message) || getString((payload.data as Record<string, unknown> | undefined)?.message)

  const normalizeStatus = (code: unknown): QrLoginStatus => {
    if (code === 0 || code === '0') return 'success'
    if (code === 86038 || code === 'expired') return 'expired'
    if (code === 86090 || code === 'scanned') return 'scanned'
    if (code === 86101 || code === 'pending') return 'pending'
    if (code === 'confirmed') return 'confirmed'
    return 'error'
  }

  const status = normalizeStatus(rawCode)
  const cookies = payload.cookies || payload.cookie || (payload.data as Record<string, unknown> | undefined)?.cookies
  const refreshToken = getString(payload.refreshToken) || getString((payload.data as Record<string, unknown> | undefined)?.refresh_token)

  return {
    status,
    message,
    cookies: cookies as string[] | string | undefined,
    refreshToken
  }
}
