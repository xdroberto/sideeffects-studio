import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookieAsync } from '@/lib/auth'
import {
    getGalleryItems,
    addGalleryItem,
    updateGalleryItem,
    deleteGalleryItem,
    type GalleryItemInput,
} from '@/lib/gallery-data'

async function requireAuth() {
    const valid = await getSessionFromCookieAsync()
    if (!valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
}

// ─── Helpers ────────────────────────────────────────────────────────
type MediaType = 'image' | 'video-mp4' | 'video-youtube'

function normalizeMediaType(raw: unknown): MediaType {
    if (raw === 'video-mp4' || raw === 'video-youtube' || raw === 'image') return raw
    return 'image'
}

const BASE_FIELDS = (body: any) => ({
    title: String(body.title || '').slice(0, 100),
    description: String(body.description || '').slice(0, 200),
    featured: Boolean(body.featured),
    aspectRatio: String(body.aspectRatio || 'landscape'),
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 999,
})

function buildInput(body: any): GalleryItemInput | { error: string } {
    const base = BASE_FIELDS(body)
    const mediaType = normalizeMediaType(body.mediaType)

    if (mediaType === 'image') {
        // Build a concrete variant first, then widen — TS won't construct a
        // discriminated union via spread + literal mediaType.
        const image = {
            ...base,
            mediaType: 'image' as const,
            imagePath: String(body.imagePath || '/uploads/placeholder.svg'),
        }
        return image satisfies GalleryItemInput
    }
    if (mediaType === 'video-mp4') {
        if (!body.videoPath || typeof body.videoPath !== 'string') {
            return { error: 'videoPath required for video-mp4' }
        }
        const mp4 = {
            ...base,
            mediaType: 'video-mp4' as const,
            videoPath: String(body.videoPath),
            posterPath: body.posterPath ? String(body.posterPath) : undefined,
        }
        return mp4 satisfies GalleryItemInput
    }
    // video-youtube
    if (!body.youtubeId || typeof body.youtubeId !== 'string') {
        return { error: 'youtubeId required for video-youtube' }
    }
    const yt = {
        ...base,
        mediaType: 'video-youtube' as const,
        youtubeId: String(body.youtubeId).slice(0, 64),
        posterPath: body.posterPath ? String(body.posterPath) : undefined,
    }
    return yt satisfies GalleryItemInput
}

// GET /api/admin/gallery — List all items (public for gallery display)
export async function GET() {
    try {
        const items = getGalleryItems()
        return NextResponse.json({ items })
    } catch (error) {
        console.error('Gallery GET error:', error)
        return NextResponse.json({ items: [] })
    }
}

// POST /api/admin/gallery — Add new item (auth required)
export async function POST(request: NextRequest) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
        const body = await request.json()
        if (!body?.title || typeof body.title !== 'string') {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        const input = buildInput(body)
        if ('error' in input) {
            return NextResponse.json({ error: input.error }, { status: 400 })
        }

        const item = addGalleryItem(input)
        return NextResponse.json({ item }, { status: 201 })
    } catch (error) {
        console.error('Gallery POST error:', error)
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
    }
}

// PUT /api/admin/gallery — Update item (auth required)
export async function PUT(request: NextRequest) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
        const body = await request.json()
        if (!body?.id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        // Partial update — if mediaType changes, rebuild from input; otherwise
        // merge field-by-field so the caller can patch just one field.
        const updates: Record<string, unknown> = {}
        if (body.title !== undefined) updates.title = String(body.title).slice(0, 100)
        if (body.description !== undefined) updates.description = String(body.description).slice(0, 200)
        if (body.featured !== undefined) updates.featured = Boolean(body.featured)
        if (body.aspectRatio !== undefined) updates.aspectRatio = String(body.aspectRatio)
        if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder)

        if (body.mediaType !== undefined) {
            // Full rebuild when mediaType changes so we don't leave stale
            // sibling fields from the previous variant.
            const input = buildInput(body)
            if ('error' in input) {
                return NextResponse.json({ error: input.error }, { status: 400 })
            }
            Object.assign(updates, input)
        } else {
            // Variant-specific field patches without mediaType swap.
            if (body.imagePath !== undefined) updates.imagePath = String(body.imagePath)
            if (body.videoPath !== undefined) updates.videoPath = String(body.videoPath)
            if (body.youtubeId !== undefined) updates.youtubeId = String(body.youtubeId).slice(0, 64)
            if (body.posterPath !== undefined) updates.posterPath = String(body.posterPath)
        }

        const item = updateGalleryItem(body.id, updates as Partial<GalleryItemInput>)
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        return NextResponse.json({ item })
    } catch (error) {
        console.error('Gallery PUT error:', error)
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }
}

// DELETE /api/admin/gallery — Delete item (auth required)
export async function DELETE(request: NextRequest) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const deleted = deleteGalleryItem(id)
        if (!deleted) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Gallery DELETE error:', error)
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }
}
