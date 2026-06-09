#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const BINARY_EXTENSIONS = /\.(avif|gif|ico|jpg|jpeg|lock|mp4|pdf|png|webm|zip)$/i

const PATTERNS = [
  ['private_key', /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/i],
  ['aws_access_key', /\bAKIA[0-9A-Z]{16}\b/],
  ['github_token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{30,}\b/],
  ['github_pat', /\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ['slack_token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['jwt_like', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  [
    'sensitive_assignment',
    /\b(?:api[_-]?key|secret|token|password|passwd|client[_-]?secret|ADMIN_JWT_SECRET|ADMIN_PASSWORD_HASH|DATABASE_URL)\b\s*[:=]\s*['"]?([^'"\s#]{12,})/i,
  ],
]

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  return output.split('\0').filter(Boolean)
}

function redact(line) {
  return line
    .trim()
    .replace(/(=|:)\s*['"]?([^'"\s#]{8,})/g, (_match, sep, value) => {
      return `${sep} ${value.slice(0, 4)}...${value.slice(-4)}`
    })
}

const findings = []

for (const file of trackedFiles()) {
  if (BINARY_EXTENSIONS.test(file)) continue

  let text = ''
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  const lines = text.split(/\r?\n/)
  for (const [index, line] of lines.entries()) {
    for (const [kind, pattern] of PATTERNS) {
      pattern.lastIndex = 0
      const match = line.match(pattern)
      if (!match) continue

      const captured = match[1]
      if (kind === 'sensitive_assignment') {
        if (!captured || /[.$({]/.test(captured)) continue
        if (/\b(process\.env|cookies?\(|request\.|hashB64|jwtSecret)\b/.test(line)) continue
      }
      if (captured === '' || captured === 'production') continue
      findings.push({
        file,
        line: index + 1,
        kind,
        preview: redact(line),
      })
    }
  }
}

if (findings.length > 0) {
  console.error('[audit:secrets] potential secrets found in tracked files:')
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.kind}] ${finding.preview}`)
  }
  process.exit(1)
}

console.log('[audit:secrets] no high-confidence secrets found in tracked files')
