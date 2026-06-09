#!/usr/bin/env node

const baseUrl = process.argv[2]

if (!baseUrl) {
  console.error('Usage: npm run smoke:http -- <base-url>')
  process.exit(2)
}

const base = new URL(baseUrl)

const publicPaths = [
  '/',
  '/sf01/',
  '/chord-lab/',
  '/playground/',
  '/privacy/',
  '/terms/',
  '/licensing/',
]

const blockedPaths = [
  '/api/admin/gallery',
  '/admin/',
  '/admin/gallery/',
  '/sf01-internal/',
  '/chord-lab-internal/',
  `/__definitely_missing_${Date.now()}__/`,
]

function urlFor(path) {
  return new URL(path, base).toString()
}

async function expectStatus(path, expected) {
  const response = await fetch(urlFor(path), { redirect: 'follow' })
  if (response.status !== expected) {
    throw new Error(`${path} expected ${expected}, got ${response.status}`)
  }
  return response
}

for (const path of publicPaths) {
  await expectStatus(path, 200)
}

for (const path of blockedPaths) {
  await expectStatus(path, 404)
}

const root = await expectStatus('/', 200)
const requiredHeaders = []
if (base.protocol === 'https:') {
  requiredHeaders.push(
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
  )
}

for (const header of requiredHeaders) {
  if (!root.headers.get(header)) {
    throw new Error(`missing security header: ${header}`)
  }
}

console.log(`[smoke:http] ${base.toString()} status and header checks passed`)
