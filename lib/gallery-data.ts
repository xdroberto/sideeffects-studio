import fs from 'fs'
import path from 'path'

// ─── Types ──────────────────────────────────────────────────────────
//
// Gallery items are a discriminated union over `mediaType`:
//
//   'image'         → static image, stored under /public/uploads
//   'video-mp4'     → self-hosted MP4/WebM video, stored under /public/uploads
//   'video-youtube' → YouTube embed by id (e.g. 'dQw4w9WgXcQ')
//
// All variants share base fields (id, title, description, sortOrder, etc).
// Type-specific fields live on their own variant.

export interface GalleryItemBase {
    id: string
    title: string
    description: string
    featured: boolean
    aspectRatio: string
    sortOrder: number
}

export interface GalleryItemImage extends GalleryItemBase {
    mediaType: 'image'
    imagePath: string          // /uploads/xxx.png|jpg|webp
}

export interface GalleryItemVideoMp4 extends GalleryItemBase {
    mediaType: 'video-mp4'
    videoPath: string          // /uploads/xxx.mp4|webm
    posterPath?: string        // /uploads/xxx-poster.jpg (optional)
}

export interface GalleryItemYouTube extends GalleryItemBase {
    mediaType: 'video-youtube'
    youtubeId: string          // 11-char YouTube id, e.g. 'dQw4w9WgXcQ'
    posterPath?: string        // optional override; default = YouTube maxres thumb
}

export type GalleryItem = GalleryItemImage | GalleryItemVideoMp4 | GalleryItemYouTube

export type GalleryItemInput = Omit<GalleryItem, 'id'>

interface GalleryData {
    items: GalleryItem[]
}

// ─── File path ──────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), 'data', 'gallery.json')

function ensureDataFile() {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ items: [] }, null, 2))
    }
}

function readData(): GalleryData {
    ensureDataFile()
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    try {
        const parsed = JSON.parse(raw)
        if (!parsed?.items || !Array.isArray(parsed.items)) return { items: [] }
        return parsed as GalleryData
    } catch {
        return { items: [] }
    }
}

function writeData(data: GalleryData) {
    ensureDataFile()
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// ─── Public API ─────────────────────────────────────────────────────
export function getGalleryItems(): GalleryItem[] {
    return readData().items.sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getGalleryItem(id: string): GalleryItem | undefined {
    return readData().items.find(item => item.id === id)
}

export function addGalleryItem(item: GalleryItemInput): GalleryItem {
    const data = readData()
    const newItem = { ...item, id: crypto.randomUUID() } as GalleryItem
    data.items.push(newItem)
    writeData(data)
    return newItem
}

export function updateGalleryItem(id: string, updates: Partial<GalleryItemInput>): GalleryItem | null {
    const data = readData()
    const index = data.items.findIndex(item => item.id === id)
    if (index === -1) return null
    // Merge while preserving the id; cast to GalleryItem since the discriminated
    // union forbids partial spread without narrowing.
    data.items[index] = { ...data.items[index], ...updates } as GalleryItem
    writeData(data)
    return data.items[index]
}

export function deleteGalleryItem(id: string): boolean {
    const data = readData()
    const before = data.items.length
    data.items = data.items.filter(item => item.id !== id)
    if (data.items.length === before) return false
    writeData(data)
    return true
}
