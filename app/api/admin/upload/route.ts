import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

export async function POST(request: NextRequest) {
    const valid = await getSessionFromCookie()
    if (!valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
                { status: 400 }
            )
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: `File too large. Max: ${MAX_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            )
        }

        // Generate safe filename
        const ext = path.extname(file.name).toLowerCase() || '.jpg'
        const safeName = `${crypto.randomUUID()}${ext}`

        await mkdir(UPLOAD_DIR, { recursive: true })
        const buffer = Buffer.from(await file.arrayBuffer())
        const filePath = path.join(UPLOAD_DIR, safeName)
        await writeFile(filePath, buffer)

        return NextResponse.json({ path: `/uploads/${safeName}` }, { status: 201 })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
