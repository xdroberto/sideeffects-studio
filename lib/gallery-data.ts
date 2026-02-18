import fs from 'fs'
import path from 'path'

// ─── Types ──────────────────────────────────────────────────────────
export interface GalleryItem {
    id: string
    title: string
    description: string
    imagePath: string
    featured: boolean
    aspectRatio: string
    sortOrder: number
}

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

export function addGalleryItem(item: Omit<GalleryItem, 'id'>): GalleryItem {
    const data = readData()
    const newItem: GalleryItem = { ...item, id: crypto.randomUUID() }
    data.items.push(newItem)
    writeData(data)
    return newItem
}

export function updateGalleryItem(id: string, updates: Partial<Omit<GalleryItem, 'id'>>): GalleryItem | null {
    const data = readData()
    const index = data.items.findIndex(item => item.id === id)
    if (index === -1) return null
    data.items[index] = { ...data.items[index], ...updates }
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
