'use client'

import { useState, FormEvent, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── Diamond Eye Icon ────────────────────────────────────────────────
// A geometric "eye" inspired by the studio's diamond motif.
// When active, the iris pulses red and scanlines sweep across.
function DiamondEye({ active, onPeek }: { active: boolean; onPeek: () => void }) {
    return (
        <button
            type="button"
            onClick={onPeek}
            aria-label="Reveal password"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'transform 0.2s',
                transform: active ? 'scale(1.15)' : 'scale(1)',
            }}
        >
            <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    filter: active ? 'drop-shadow(0 0 6px #ff0000)' : 'none',
                    transition: 'filter 0.3s',
                }}
            >
                {/* Outer diamond shape (eye outline) */}
                <path
                    d="M12 4L22 12L12 20L2 12Z"
                    stroke={active ? '#ff0000' : '#444'}
                    strokeWidth="1.5"
                    fill="none"
                    style={{
                        transition: 'stroke 0.3s',
                    }}
                />
                {/* Inner iris — small diamond */}
                <path
                    d="M12 8L16 12L12 16L8 12Z"
                    stroke={active ? '#ff0000' : '#555'}
                    strokeWidth="1"
                    fill={active ? '#ff0000' : 'none'}
                    style={{
                        transition: 'all 0.3s',
                        opacity: active ? 1 : 0.6,
                    }}
                />
                {/* Pupil — center dot */}
                <circle
                    cx="12"
                    cy="12"
                    r={active ? 2 : 1.5}
                    fill={active ? '#fff' : '#666'}
                    style={{ transition: 'all 0.3s' }}
                />
                {/* Scan line — horizontal sweep */}
                {active && (
                    <line
                        x1="2"
                        y1="12"
                        x2="22"
                        y2="12"
                        stroke="#ff0000"
                        strokeWidth="0.5"
                        opacity="0.8"
                    >
                        <animate
                            attributeName="y1"
                            values="4;20;4"
                            dur="1s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="y2"
                            values="4;20;4"
                            dur="1s"
                            repeatCount="indefinite"
                        />
                    </line>
                )}
            </svg>
        </button>
    )
}

// ─── Login Page ──────────────────────────────────────────────────────
export default function AdminLogin() {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [peeking, setPeeking] = useState(false)
    const peekTimer = useRef<NodeJS.Timeout | null>(null)
    const router = useRouter()

    // Auto-hide password after 2s
    const handlePeek = useCallback(() => {
        if (peekTimer.current) clearTimeout(peekTimer.current)
        setPeeking(true)
        peekTimer.current = setTimeout(() => setPeeking(false), 2000)
    }, [])

    useEffect(() => {
        return () => { if (peekTimer.current) clearTimeout(peekTimer.current) }
    }, [])

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

                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <input
                        type={peeking ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        autoFocus
                        required
                        style={{
                            width: '100%',
                            padding: '10px 40px 10px 12px',
                            background: '#0a0a0a',
                            border: `1px solid ${peeking ? '#c00' : '#333'}`,
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.3s',
                        }}
                    />
                    <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }}>
                        <DiamondEye active={peeking} onPeek={handlePeek} />
                    </div>
                </div>

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
