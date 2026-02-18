import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { getGalleryItems, addGalleryItem, updateGalleryItem, deleteGalleryItem } from '@/lib/gallery-data'

async function requireAuth() {
    const valid = await getSessionFromCookie()
    if (!valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
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

        const item = addGalleryItem({
            title: body.title.slice(0, 100),
            description: (body.description || '').slice(0, 200),
            imagePath: body.imagePath || '/uploads/placeholder.svg',
            featured: Boolean(body.featured),
            aspectRatio: body.aspectRatio || 'landscape',
            sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 999,
        })

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

        const updates: Record<string, unknown> = {}
        if (body.title !== undefined) updates.title = String(body.title).slice(0, 100)
        if (body.description !== undefined) updates.description = String(body.description).slice(0, 200)
        if (body.imagePath !== undefined) updates.imagePath = String(body.imagePath)
        if (body.featured !== undefined) updates.featured = Boolean(body.featured)
        if (body.aspectRatio !== undefined) updates.aspectRatio = String(body.aspectRatio)
        if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder)

        const item = updateGalleryItem(body.id, updates)
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
