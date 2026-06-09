import assert from 'node:assert/strict'
import test from 'node:test'

import { isLocalAdminEnabled } from '../../lib/local-admin.mjs'

test('local admin is disabled by default', () => {
  assert.equal(isLocalAdminEnabled({}), false)
})

test('local admin is enabled only with the explicit flag outside production', () => {
  assert.equal(isLocalAdminEnabled({ ENABLE_LOCAL_ADMIN: 'true', NODE_ENV: 'development' }), true)
  assert.equal(isLocalAdminEnabled({ ENABLE_LOCAL_ADMIN: '1', NODE_ENV: 'development' }), false)
  assert.equal(isLocalAdminEnabled({ ENABLE_LOCAL_ADMIN: 'true', NODE_ENV: 'production' }), false)
})
