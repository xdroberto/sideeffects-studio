import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookieAsync } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const VIDEO_TYPES = ['video/mp4', 'video/webm']
const ALL_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES]

const MAX_IMAGE_SIZE = 5 * 1024 * 1024   // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024  // 50MB

export async function POST(request: NextRequest) {
    const valid = await getSessionFromCookieAsync()
    if (!valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!ALL_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Invalid file type. Allowed: ${ALL_TYPES.join(', ')}` },
                { status: 400 }
            )
        }

        const isVideo = VIDEO_TYPES.includes(file.type)
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

        if (file.size > maxSize) {
            return NextResponse.json(
                { error: `File too large. Max: ${maxSize / 1024 / 1024}MB` },
                { status: 400 }
            )
        }

        // Generate safe filename
        const ext = path.extname(file.name).toLowerCase() || (isVideo ? '.mp4' : '.jpg')
        const safeName = `${crypto.randomUUID()}${ext}`

        await mkdir(UPLOAD_DIR, { recursive: true })
        const buffer = Buffer.from(await file.arrayBuffer())
        const filePath = path.join(UPLOAD_DIR, safeName)
        await writeFile(filePath, buffer)

        return NextResponse.json({
            path: `/uploads/${safeName}`,
            type: isVideo ? 'video' : 'image',
        }, { status: 201 })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
