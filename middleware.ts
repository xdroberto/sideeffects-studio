import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function getSecret(): Uint8Array {
    const secret = process.env.ADMIN_JWT_SECRET
    if (!secret) return new Uint8Array()
    return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
    // Only protect /admin/gallery (not /admin login page itself)
    if (!request.nextUrl.pathname.startsWith('/admin/gallery')) {
        return NextResponse.next()
    }

    const token = request.cookies.get('admin_session')?.value
    if (!token) {
        return NextResponse.redirect(new URL('/admin', request.url))
    }

    try {
        const secret = getSecret()
        if (secret.length === 0) {
            return NextResponse.redirect(new URL('/admin', request.url))
        }
        await jwtVerify(token, secret)
        return NextResponse.next()
    } catch {
        return NextResponse.redirect(new URL('/admin', request.url))
    }
}

export const config = {
    matcher: ['/admin/gallery/:path*'],
}
