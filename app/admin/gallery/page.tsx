'use client'

import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// ─── Types (mirror lib/gallery-data.ts discriminated union) ─────────
type MediaType = 'image' | 'video-mp4' | 'video-youtube'

interface GalleryItemBase {
    id: string
    title: string
    description: string
    featured: boolean
    aspectRatio: string
    sortOrder: number
}
type GalleryItem =
    | (GalleryItemBase & { mediaType: 'image'; imagePath: string })
    | (GalleryItemBase & { mediaType: 'video-mp4'; videoPath: string; posterPath?: string })
    | (GalleryItemBase & { mediaType: 'video-youtube'; youtubeId: string; posterPath?: string })

interface FormState {
    title: string
    description: string
    featured: boolean
    aspectRatio: string
    sortOrder: number
    mediaType: MediaType
    imagePath: string        // for 'image'
    videoPath: string        // for 'video-mp4'
    posterPath: string       // for 'video-mp4' and 'video-youtube'
    youtubeId: string        // for 'video-youtube'
}

const EMPTY_FORM: FormState = {
    title: '',
    description: '',
    featured: false,
    aspectRatio: 'landscape',
    sortOrder: 0,
    mediaType: 'image',
    imagePath: '/uploads/placeholder.svg',
    videoPath: '',
    posterPath: '',
    youtubeId: '',
}

// Extract a YouTube id from a full URL or accept a bare id.
function parseYouTubeId(input: string): string {
    if (!input) return ''
    const trimmed = input.trim()
    // Bare id (11 chars, alnum + - _)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
    const match = trimmed.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    )
    return match ? match[1] : trimmed
}

function getThumbForItem(item: GalleryItem): string {
    if (item.mediaType === 'image') return item.imagePath
    if (item.mediaType === 'video-mp4') return item.posterPath || '/uploads/placeholder.svg'
    return item.posterPath || `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`
}

export default function AdminGallery() {
    const [items, setItems] = useState<GalleryItem[]>([])
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [editId, setEditId] = useState<string | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadingVideo, setUploadingVideo] = useState(false)
    const [uploadingPoster, setUploadingPoster] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()

    const loadItems = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/gallery')
            const data = await res.json()
            setItems(data.items || [])
        } catch { setItems([]) }
    }, [])

    useEffect(() => { loadItems() }, [loadItems])

    async function handleUpload(
        e: ChangeEvent<HTMLInputElement>,
        field: 'imagePath' | 'videoPath' | 'posterPath',
    ) {
        const file = e.target.files?.[0]
        if (!file) return
        const setLoading =
            field === 'imagePath' ? setUploadingImage
                : field === 'videoPath' ? setUploadingVideo
                    : setUploadingPoster
        setLoading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
            if (!res.ok) {
                const data = await res.json()
                setMessage(`Upload failed: ${data.error}`)
                return
            }
            const data = await res.json()
            setForm(prev => ({ ...prev, [field]: data.path }))
            setMessage(`${field} uploaded`)
        } catch { setMessage('Upload error') }
        finally { setLoading(false) }
    }

    function buildPayload(state: FormState) {
        const base = {
            title: state.title,
            description: state.description,
            featured: state.featured,
            aspectRatio: state.aspectRatio,
            sortOrder: state.sortOrder,
            mediaType: state.mediaType,
        }
        if (state.mediaType === 'image') {
            return { ...base, imagePath: state.imagePath }
        }
        if (state.mediaType === 'video-mp4') {
            return {
                ...base,
                videoPath: state.videoPath,
                posterPath: state.posterPath || undefined,
            }
        }
        // video-youtube
        return {
            ...base,
            youtubeId: parseYouTubeId(state.youtubeId),
            posterPath: state.posterPath || undefined,
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        try {
            const payload = buildPayload(form)

            // Client-side guard rails for required per-variant fields.
            if (form.mediaType === 'video-mp4' && !form.videoPath) {
                setMessage('Video file is required for MP4 items')
                setSaving(false)
                return
            }
            if (form.mediaType === 'video-youtube' && !form.youtubeId) {
                setMessage('YouTube ID/URL is required for YouTube items')
                setSaving(false)
                return
            }

            if (editId) {
                const res = await fetch('/api/admin/gallery', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editId, ...payload }),
                })
                if (!res.ok) throw new Error()
                setMessage('Updated')
            } else {
                const res = await fetch('/api/admin/gallery', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error()
                setMessage('Added')
            }
            setForm(EMPTY_FORM)
            setEditId(null)
            await loadItems()
        } catch { setMessage('Save failed') }
        finally { setSaving(false) }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this item?')) return
        try {
            await fetch(`/api/admin/gallery?id=${id}`, { method: 'DELETE' })
            await loadItems()
            setMessage('Deleted')
        } catch { setMessage('Delete failed') }
    }

    function handleEdit(item: GalleryItem) {
        setEditId(item.id)
        const base = {
            title: item.title,
            description: item.description,
            featured: item.featured,
            aspectRatio: item.aspectRatio,
            sortOrder: item.sortOrder,
        }
        if (item.mediaType === 'image') {
            setForm({
                ...EMPTY_FORM,
                ...base,
                mediaType: 'image',
                imagePath: item.imagePath,
            })
        } else if (item.mediaType === 'video-mp4') {
            setForm({
                ...EMPTY_FORM,
                ...base,
                mediaType: 'video-mp4',
                videoPath: item.videoPath,
                posterPath: item.posterPath || '',
            })
        } else {
            setForm({
                ...EMPTY_FORM,
                ...base,
                mediaType: 'video-youtube',
                youtubeId: item.youtubeId,
                posterPath: item.posterPath || '',
            })
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function handleLogout() {
        await fetch('/api/admin/auth', { method: 'DELETE' })
        router.push('/admin')
    }

    const s = {
        page: { minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '20px' } as const,
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #222', paddingBottom: '16px' } as const,
        card: { background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '20px', marginBottom: '20px' } as const,
        input: { width: '100%', padding: '8px 10px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' as const },
        label: { display: 'block', color: '#888', fontSize: '11px', textTransform: 'uppercase' as const, marginBottom: '4px', letterSpacing: '0.5px' },
        btn: { padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
        btnPrimary: { background: '#c00', color: '#fff' },
        btnGhost: { background: 'transparent', color: '#888', border: '1px solid #333' },
        row: { display: 'flex', gap: '10px', marginBottom: '10px' } as const,
        thumb: { position: 'relative' as const, width: '80px', height: '60px', borderRadius: '4px', overflow: 'hidden', background: '#0a0a0a', flexShrink: 0 },
        itemRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#111', border: '1px solid #222', borderRadius: '6px', marginBottom: '8px' } as const,
        msg: { padding: '6px 12px', background: '#112211', border: '1px solid #1a3a1a', color: '#6c6', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' },
        tab: (active: boolean) => ({
            padding: '6px 14px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
            background: active ? '#c00' : '#222', color: active ? '#fff' : '#888',
            transition: 'all 0.2s',
        }),
    }

    return (
        <div style={s.page}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                {/* Header */}
                <div style={s.header}>
                    <h1 style={{ fontSize: '16px', fontWeight: 500 }}>Gallery Admin</h1>
                    <button onClick={handleLogout} style={{ ...s.btn, ...s.btnGhost }}>Logout</button>
                </div>

                {message && <div style={s.msg}>{message}</div>}

                {/* Form */}
                <div style={s.card}>
                    <h2 style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
                        {editId ? 'Edit Item' : 'Add New Item'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        {/* Media Type Toggle */}
                        <label style={s.label}>Media Type</label>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setForm(p => ({ ...p, mediaType: 'image' }))} style={s.tab(form.mediaType === 'image')}>Image</button>
                            <button type="button" onClick={() => setForm(p => ({ ...p, mediaType: 'video-mp4' }))} style={s.tab(form.mediaType === 'video-mp4')}>Video (MP4)</button>
                            <button type="button" onClick={() => setForm(p => ({ ...p, mediaType: 'video-youtube' }))} style={s.tab(form.mediaType === 'video-youtube')}>YouTube</button>
                        </div>

                        <label style={s.label}>Title</label>
                        <input
                            style={s.input}
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="Artwork title"
                            required
                            maxLength={100}
                        />

                        <label style={s.label}>Description</label>
                        <textarea
                            style={{ ...s.input, resize: 'vertical', minHeight: '60px' }}
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Brief description"
                            maxLength={200}
                        />

                        {/* IMAGE variant */}
                        {form.mediaType === 'image' && (
                            <div style={s.row}>
                                <div style={{ flex: 1 }}>
                                    <label style={s.label}>Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleUpload(e, 'imagePath')}
                                        disabled={uploadingImage}
                                        style={{ ...s.input, padding: '6px' }}
                                    />
                                    {uploadingImage && <span style={{ color: '#888', fontSize: '11px' }}>Uploading...</span>}
                                </div>
                                {form.imagePath && form.imagePath !== '/uploads/placeholder.svg' && (
                                    <div style={s.thumb}>
                                        <Image src={form.imagePath} alt="Preview" fill style={{ objectFit: 'cover' }} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIDEO-MP4 variant */}
                        {form.mediaType === 'video-mp4' && (
                            <>
                                <label style={s.label}>Video file (MP4/WebM)</label>
                                <input
                                    type="file"
                                    accept="video/mp4,video/webm"
                                    onChange={e => handleUpload(e, 'videoPath')}
                                    disabled={uploadingVideo}
                                    style={{ ...s.input, padding: '6px' }}
                                />
                                {uploadingVideo && <span style={{ color: '#888', fontSize: '11px' }}>Uploading video...</span>}
                                {form.videoPath && (
                                    <p style={{ color: '#6c6', fontSize: '11px', marginTop: '-4px', marginBottom: '10px' }}>✓ {form.videoPath}</p>
                                )}

                                <label style={s.label}>Poster (optional)</label>
                                <div style={s.row}>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleUpload(e, 'posterPath')}
                                            disabled={uploadingPoster}
                                            style={{ ...s.input, padding: '6px' }}
                                        />
                                        {uploadingPoster && <span style={{ color: '#888', fontSize: '11px' }}>Uploading...</span>}
                                    </div>
                                    {form.posterPath && (
                                        <div style={s.thumb}>
                                            <Image src={form.posterPath} alt="Poster" fill style={{ objectFit: 'cover' }} />
                                        </div>
                                    )}
                                </div>
                                <p style={{ color: '#555', fontSize: '11px', marginTop: '-2px', marginBottom: '12px' }}>
                                    Cover frame shown in the grid before playback. Recommended for best UX.
                                </p>
                            </>
                        )}

                        {/* VIDEO-YOUTUBE variant */}
                        {form.mediaType === 'video-youtube' && (
                            <>
                                <label style={s.label}>YouTube ID or URL</label>
                                <input
                                    style={s.input}
                                    value={form.youtubeId}
                                    onChange={e => setForm(p => ({ ...p, youtubeId: e.target.value }))}
                                    placeholder="dQw4w9WgXcQ  or  https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                    maxLength={500}
                                />
                                <p style={{ color: '#555', fontSize: '11px', marginTop: '-6px', marginBottom: '12px' }}>
                                    Paste the URL or just the 11-char id. We extract it automatically.
                                </p>

                                <label style={s.label}>Poster override (optional)</label>
                                <div style={s.row}>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleUpload(e, 'posterPath')}
                                            disabled={uploadingPoster}
                                            style={{ ...s.input, padding: '6px' }}
                                        />
                                        {uploadingPoster && <span style={{ color: '#888', fontSize: '11px' }}>Uploading...</span>}
                                    </div>
                                    {form.posterPath && (
                                        <div style={s.thumb}>
                                            <Image src={form.posterPath} alt="Poster" fill style={{ objectFit: 'cover' }} />
                                        </div>
                                    )}
                                </div>
                                <p style={{ color: '#555', fontSize: '11px', marginTop: '-2px', marginBottom: '12px' }}>
                                    Defaults to YouTube&apos;s maxres thumbnail. Upload a custom one to override.
                                </p>
                            </>
                        )}

                        <div style={s.row}>
                            <div style={{ flex: 1 }}>
                                <label style={s.label}>Aspect Ratio</label>
                                <select
                                    style={s.input}
                                    value={form.aspectRatio}
                                    onChange={e => setForm(p => ({ ...p, aspectRatio: e.target.value }))}
                                >
                                    <option value="landscape">Landscape (3:2)</option>
                                    <option value="portrait">Portrait (2:3)</option>
                                    <option value="square">Square (1:1)</option>
                                    <option value="wide">Wide (16:9)</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={s.label}>Sort Order</label>
                                <input
                                    type="number"
                                    style={s.input}
                                    value={form.sortOrder}
                                    onChange={e => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '13px', marginBottom: '16px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))}
                            />
                            Featured (larger in grid)
                        </label>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" disabled={saving} style={{ ...s.btn, ...s.btnPrimary }}>
                                {saving ? '...' : editId ? 'Save Changes' : 'Add Item'}
                            </button>
                            {editId && (
                                <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_FORM) }} style={{ ...s.btn, ...s.btnGhost }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Items list */}
                <h2 style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                    Gallery Items ({items.length})
                </h2>
                {items.length === 0 && (
                    <p style={{ color: '#555', fontSize: '13px' }}>No items yet. Add one above.</p>
                )}
                {items.map(item => {
                    const thumb = getThumbForItem(item)
                    const isVideo = item.mediaType !== 'image'
                    const variantLabel =
                        item.mediaType === 'image' ? '' :
                            item.mediaType === 'video-mp4' ? 'MP4' : 'YOUTUBE'
                    return (
                        <div key={item.id} style={s.itemRow}>
                            <div style={s.thumb}>
                                <Image src={thumb} alt={item.title} fill style={{ objectFit: 'cover' }} unoptimized={thumb.startsWith('http')} />
                                {isVideo && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                                        <span style={{ fontSize: '20px', color: '#fff' }}>▶</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                                    {variantLabel && <span style={{ color: '#c00', marginRight: '6px', fontSize: '10px', letterSpacing: '0.5px' }}>{variantLabel}</span>}
                                    {item.title}
                                    {item.featured && <span style={{ color: '#c00', marginLeft: '6px', fontSize: '11px' }}>* Featured</span>}
                                </div>
                                {item.description && (
                                    <div style={{ color: '#666', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.description}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                <button onClick={() => handleEdit(item)} style={{ ...s.btn, ...s.btnGhost, padding: '4px 10px', fontSize: '12px' }}>Edit</button>
                                <button onClick={() => handleDelete(item.id)} style={{ ...s.btn, background: '#220808', color: '#c66', padding: '4px 10px', fontSize: '12px', border: '1px solid #331111' }}>Delete</button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
