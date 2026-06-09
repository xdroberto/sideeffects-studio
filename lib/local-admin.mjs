export function isLocalAdminEnabled(env = process.env) {
  return env.ENABLE_LOCAL_ADMIN === 'true' && env.NODE_ENV !== 'production'
}
