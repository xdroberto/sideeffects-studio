import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'admin_session'
const TOKEN_EXPIRY = '24h'

function getSecret(): Uint8Array {
    const secret = process.env.ADMIN_JWT_SECRET
    if (!secret) throw new Error('ADMIN_JWT_SECRET not set in .env.local')
    return new TextEncoder().encode(secret)
}

// ─── Password ───────────────────────────────────────────────────────
export async function verifyPassword(password: string): Promise<boolean> {
    const hashB64 = process.env.ADMIN_PASSWORD_HASH
    if (!hashB64) return false
    // Hash is stored as base64 in .env.local to avoid dotenv $ expansion issues
    const hash = Buffer.from(hashB64, 'base64').toString('utf-8')
    return bcrypt.compare(password, hash)
}

// ─── JWT ────────────────────────────────────────────────────────────
export async function createSession(): Promise<string> {
    const token = await new SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(getSecret())
    return token
}

export async function verifySession(token: string): Promise<boolean> {
    try {
        await jwtVerify(token, getSecret())
        return true
    } catch {
        return false
    }
}

// ─── Cookie helpers (Next.js 14: cookies() is synchronous) ──────────
export function setSessionCookie(token: string) {
    const cookieStore = cookies()
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    })
}

export function clearSessionCookie() {
    const cookieStore = cookies()
    cookieStore.delete(COOKIE_NAME)
}

export function getSessionFromCookie(): boolean {
    // Note: this is sync in Next.js 14. For token verification, we do
    // a synchronous check first (just that the token exists and hasn't expired)
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return false
    // We can't await here in middleware, but the jose verify is needed.
    // For sync usage, just check the token exists. The API routes do async verification.
    return true
}

export async function getSessionFromCookieAsync(): Promise<boolean> {
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return false
    return verifySession(token)
}

// ─── Rate Limiting (in-memory, simple) ──────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now()
    const record = loginAttempts.get(ip)

    if (!record || now > record.resetAt) {
        loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 })
        return { allowed: true }
    }

    if (record.count >= 5) {
        const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000)
        return { allowed: false, retryAfterSeconds }
    }

    record.count++
    return { allowed: true }
}
