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
    const hash = process.env.ADMIN_PASSWORD_HASH
    if (!hash) return false
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

// ─── Cookie helpers ─────────────────────────────────────────────────
export async function setSessionCookie(token: string) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    })
}

export async function clearSessionCookie() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
}

export async function getSessionFromCookie(): Promise<boolean> {
    const cookieStore = await cookies()
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
