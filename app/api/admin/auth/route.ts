import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSession, setSessionCookie, clearSessionCookie, checkRateLimit } from '@/lib/auth'

// POST /api/admin/auth — Login
export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        const rateCheck = checkRateLimit(ip)
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: `Too many attempts. Try again in ${rateCheck.retryAfterSeconds}s.` },
                { status: 429 }
            )
        }

        const body = await request.json().catch(() => null)
        if (!body?.password || typeof body.password !== 'string') {
            return NextResponse.json({ error: 'Password required' }, { status: 400 })
        }

        const valid = await verifyPassword(body.password)
        if (!valid) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
        }

        const token = await createSession()
        await setSessionCookie(token)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Auth error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// DELETE /api/admin/auth — Logout
export async function DELETE() {
    await clearSessionCookie()
    return NextResponse.json({ success: true })
}
