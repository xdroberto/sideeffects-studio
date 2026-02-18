'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Login failed')
                return
            }

            router.push('/admin/gallery')
        } catch {
            setError('Connection error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
        }}>
            <form onSubmit={handleSubmit} style={{
                background: '#111',
                border: '1px solid #222',
                borderRadius: '8px',
                padding: '40px',
                width: '100%',
                maxWidth: '360px',
            }}>
                <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 500, marginBottom: '24px', textAlign: 'center' }}>
                    Admin
                </h1>

                {error && (
                    <div style={{
                        background: '#2d1111',
                        border: '1px solid #5c2020',
                        color: '#ff6b6b',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        marginBottom: '16px',
                    }}>
                        {error}
                    </div>
                )}

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoFocus
                    required
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#0a0a0a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none',
                        marginBottom: '16px',
                        boxSizing: 'border-box',
                    }}
                />

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: loading ? '#333' : '#c00',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '14px',
                        cursor: loading ? 'wait' : 'pointer',
                    }}
                >
                    {loading ? '...' : 'Login'}
                </button>
            </form>
        </div>
    )
}
