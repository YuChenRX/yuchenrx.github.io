import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { config } from '@/config'
import { logger } from '@/utils/logger'

export type BiliAuth = {
  cookie?: string
  cookies?: Record<string, string>
  csrf?: string
  uid?: string
  refreshToken?: string
  updatedAt: string
}

const AUTH_FILE = 'bilibili-auth.json'
let cachedAuth: BiliAuth | null = null

function extractCookieValue(cookie: string, key: string): string | undefined {
  const match = cookie.match(new RegExp(`${key}=([^;]+)`))
  return match?.[1]
}

function normalizeCookieString(cookie: string | undefined, cookies: Record<string, string> | undefined): string | undefined {
  if (cookie && cookie.trim()) return cookie.trim()
  if (!cookies) return undefined
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}

export function parseSetCookie(setCookie: string[]): Record<string, string> {
  const jar: Record<string, string> = {}
  setCookie.forEach((item) => {
    const [pair] = item.split(';')
    const [key, value] = pair.split('=')
    if (key && value) {
      jar[key.trim()] = value.trim()
    }
  })
  return jar
}

export async function loadBiliAuth(): Promise<BiliAuth | null> {
  if (cachedAuth) return cachedAuth

  const filePath = join(config.dataDir, AUTH_FILE)
  const data = await readFile(filePath, 'utf-8').catch(() => null)
  if (!data) return null

  const parsed = JSON.parse(data) as BiliAuth
  cachedAuth = parsed
  return parsed
}

export async function saveBiliAuth(auth: Omit<BiliAuth, 'updatedAt'>): Promise<BiliAuth> {
  const updated: BiliAuth = {
    ...auth,
    updatedAt: new Date().toISOString()
  }

  await mkdir(config.dataDir, { recursive: true }).catch((error) => {
    logger.error('❌ 创建数据目录失败:', error)
  })

  const filePath = join(config.dataDir, AUTH_FILE)
  await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')

  cachedAuth = updated
  return updated
}

export async function clearBiliAuth(): Promise<void> {
  cachedAuth = null
  await mkdir(config.dataDir, { recursive: true }).catch(() => {})
  const filePath = join(config.dataDir, AUTH_FILE)
  await writeFile(filePath, JSON.stringify({}, null, 2), 'utf-8').catch(() => {})
}

export async function getBiliCookieHeader(): Promise<string | undefined> {
  const auth = await loadBiliAuth()
  if (!auth) return undefined
  return normalizeCookieString(auth.cookie, auth.cookies)
}

export async function getBiliAuthStatus(): Promise<BiliAuth | null> {
  const auth = await loadBiliAuth()
  if (!auth || (!auth.cookie && !auth.cookies)) return null
  return auth
}

export function normalizeLoginCookies(input: unknown): {
  cookie?: string
  cookies?: Record<string, string>
  csrf?: string
  uid?: string
} {
  if (!input) return {}

  if (typeof input === 'string') {
    const csrf = extractCookieValue(input, 'bili_jct')
    const uid = extractCookieValue(input, 'DedeUserID')
    return { cookie: input, csrf, uid }
  }

  if (Array.isArray(input) && input.every(item => typeof item === 'string')) {
    const jar = parseSetCookie(input as string[])
    const cookie = normalizeCookieString(undefined, jar)
    return {
      cookie,
      cookies: jar,
      csrf: jar.bili_jct,
      uid: jar.DedeUserID
    }
  }

  if (typeof input === 'object') {
    const record = input as Record<string, unknown>
    const cookie = typeof record.cookie === 'string' ? record.cookie : undefined
    const cookies = typeof record.cookies === 'object' && record.cookies
      ? record.cookies as Record<string, string>
      : undefined
    const cookieString = normalizeCookieString(cookie, cookies)
    const csrf = extractCookieValue(cookieString || '', 'bili_jct')
    const uid = extractCookieValue(cookieString || '', 'DedeUserID')
    return { cookie: cookieString, cookies, csrf, uid }
  }

  return {}
}
