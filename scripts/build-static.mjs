#!/usr/bin/env node
/**
 * build-static.mjs
 *
 * Builds the Next.js site as a static export (`output: 'export'`) while
 * temporarily moving server-only routes/files out of the way so the export
 * does not fail on them.
 *
 * Critical invariant: all moved paths MUST be restored to their original
 * location, even if `next build` throws. This is implemented with a
 * `try { ... } finally { restore }` block.
 *
 * Usage:
 *   node scripts/build-static.mjs
 */

import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

const ROOT = process.cwd()
const DISABLED_DIR = resolve(ROOT, '.next-disabled')

// Order matters only for documentation; restoration uses reverse(moved).
const MOVES = [
  { from: 'app/admin',              to: '.next-disabled/app__admin' },
  { from: 'app/api',                to: '.next-disabled/app__api' },
  { from: 'app/sf01-internal',      to: '.next-disabled/app__sf01-internal' },
  { from: 'app/chord-lab-internal', to: '.next-disabled/app__chord-lab-internal' },
  { from: 'middleware.ts',          to: '.next-disabled/middleware.ts' },
]

function move(from, to) {
  const src = resolve(ROOT, from)
  const dst = resolve(ROOT, to)
  if (!existsSync(src)) return false
  mkdirSync(dirname(dst), { recursive: true })
  renameSync(src, dst)
  return true
}

const moved = []
try {
  if (!existsSync(DISABLED_DIR)) {
    mkdirSync(DISABLED_DIR, { recursive: true })
  }

  for (const m of MOVES) {
    if (move(m.from, m.to)) {
      moved.push(m)
      console.log(`[build-static] disabled ${m.from}`)
    } else {
      console.log(`[build-static] skipped (missing) ${m.from}`)
    }
  }

  console.log('[build-static] running next build...')
  execSync('npx next build', { stdio: 'inherit' })
  console.log('[build-static] build complete')
} catch (err) {
  console.error('[build-static] build failed:', err && err.message ? err.message : err)
  process.exitCode = 1
} finally {
  // CRITICAL: restore in reverse order to mirror move order and avoid any
  // collisions. We restore even on success so the working tree is clean.
  for (const m of [...moved].reverse()) {
    try {
      move(m.to, m.from)
      console.log(`[build-static] restored ${m.from}`)
    } catch (restoreErr) {
      console.error(
        `[build-static] FAILED to restore ${m.from} from ${m.to}:`,
        restoreErr && restoreErr.message ? restoreErr.message : restoreErr,
      )
      // Force non-zero exit so CI / caller notices something is wrong.
      process.exitCode = process.exitCode || 1
    }
  }
}
