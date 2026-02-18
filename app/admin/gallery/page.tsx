'use client'

import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface GalleryItem {
    id: string
    title: string
    description: string
    imagePath: string
    featured: boolean
    aspectRatio: string
    sortOrder: number
}

const EMPTY_FORM = { title: '', description: '', imagePath: '/uploads/placeholder.svg', featured: false, aspectRatio: 'landscape', sortOrder: 0 }

export default function AdminGallery() {
    const [items, setItems] = useState<GalleryItem[]>([])
    const [form, setForm] = useState(EMPTY_FORM)
    const [editId, setEditId] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
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

    async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
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
            setForm(prev => ({ ...prev, imagePath: data.path }))
            setMessage('Image uploaded')
        } catch { setMessage('Upload error') }
        finally { setUploading(false) }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        try {
            if (editId) {
                const res = await fetch('/api/admin/gallery', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editId, ...form }),
                })
                if (!res.ok) throw new Error()
                setMessage('Updated')
            } else {
                const res = await fetch('/api/admin/gallery', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
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
        setForm({
            title: item.title,
            description: item.description,
            imagePath: item.imagePath,
            featured: item.featured,
            aspectRatio: item.aspectRatio,
            sortOrder: item.sortOrder,
        })
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

                        <div style={s.row}>
                            <div style={{ flex: 1 }}>
                                <label style={s.label}>Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUpload}
                                    disabled={uploading}
                                    style={{ ...s.input, padding: '6px' }}
                                />
                                {uploading && <span style={{ color: '#888', fontSize: '11px' }}>Uploading...</span>}
                            </div>
                            {form.imagePath && form.imagePath !== '/uploads/placeholder.svg' && (
                                <div style={s.thumb}>
                                    <Image src={form.imagePath} alt="Preview" fill style={{ objectFit: 'cover' }} />
                                </div>
                            )}
                        </div>

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
                {items.map(item => (
                    <div key={item.id} style={s.itemRow}>
                        <div style={s.thumb}>
                            <Image src={item.imagePath} alt={item.title} fill style={{ objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                                {item.title}
                                {item.featured && <span style={{ color: '#c00', marginLeft: '6px', fontSize: '11px' }}>★ Featured</span>}
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
                ))}
            </div>
        </div>
    )
}
