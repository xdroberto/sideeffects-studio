#!/usr/bin/env node
/**
 * One-time setup: sets your admin password.
 * Usage: node scripts/set-password.mjs
 */
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createInterface } from 'readline'

const ENV_PATH = path.join(process.cwd(), '.env.local')

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((resolve) => rl.question(q, resolve))

async function main() {
    console.log('\n🔐 Admin Password Setup\n')

    const password = await ask('Enter your admin password: ')
    if (!password || password.length < 8) {
        console.error('❌ Password must be at least 8 characters.')
        process.exit(1)
    }

    const hash = await bcrypt.hash(password, 12)
    const jwtSecret = crypto.randomBytes(32).toString('hex')

    // Read existing .env.local or create new
    let envContent = ''
    if (fs.existsSync(ENV_PATH)) {
        envContent = fs.readFileSync(ENV_PATH, 'utf-8')
        // Remove old entries if they exist
        envContent = envContent
            .split('\n')
            .filter(line => !line.startsWith('ADMIN_PASSWORD_HASH=') && !line.startsWith('ADMIN_JWT_SECRET='))
            .join('\n')
            .trimEnd()
        envContent += '\n'
    }

    envContent += `ADMIN_PASSWORD_HASH=${hash}\n`
    envContent += `ADMIN_JWT_SECRET=${jwtSecret}\n`

    fs.writeFileSync(ENV_PATH, envContent)
    console.log('\n✅ Password hash and JWT secret saved to .env.local')
    console.log('   Restart your dev server for changes to take effect.\n')
    rl.close()
}

main().catch(console.error)
